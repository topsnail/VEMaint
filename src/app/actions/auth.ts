"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { hasPermission, normalizePermissionKeys, parseUserRole, type UserRole } from "@/lib/authz";
import { getCurrentAuthSession, hasCurrentUserPermission } from "@/lib/auth-session";
import { SESSION_COOKIE_KEY, signSession } from "@/lib/auth-token";
import { writeAuditLog } from "@/lib/audit";
import { constantTimeEqualStr, getBootstrapAdminConfig } from "@/lib/bootstrap-admin";
import {
  createAuthUser,
  hasAuthUsers,
  listAuthUsers,
  normalizeUsername,
  setAuthUserDisabled,
  updateAuthUserPassword,
  updateAuthUserPermissions,
  updateAuthUserRole,
  verifyPassword,
} from "@/lib/auth-users";

const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

function mapRole(v: string): UserRole | null {
  return parseUserRole(v);
}

function safeUserRows(rows: Awaited<ReturnType<typeof listAuthUsers>>) {
  return rows.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    disabled: u.disabled,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    permissions: Array.isArray(u.permissions) ? u.permissions : null,
  }));
}

function canManageByUserRow(user: { role: UserRole; permissions?: string[] | null; disabled: boolean }) {
  if (user.disabled) return false;
  const permissions = Array.isArray(user.permissions) ? normalizePermissionKeys(user.permissions) : undefined;
  return hasPermission("users.manage", user.role, permissions);
}

function ensureAtLeastOneManager(users: Awaited<ReturnType<typeof listAuthUsers>>) {
  if (users.some((u) => canManageByUserRow(u))) return;
  throw new Error("至少需要保留 1 个可用的用户管理账号");
}

async function setSessionCookie(userId: string, username: string, role: UserRole) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const token = await signSession({ userId, username, role, exp });
  const store = await cookies();
  store.set(SESSION_COOKIE_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function loginAction(input: { username: string; password: string }) {
  const username = normalizeUsername(input.username);
  const password = input.password ?? "";
  if (!username || !password) return { ok: false as const, error: "请输入用户名和密码" };

  const users = await listAuthUsers();
  const bootstrap = getBootstrapAdminConfig();

  // KV 尚无用户且已在云端配置 BOOTSTRAP_ADMIN_PASSWORD：仅此凭据可创建首个超级管理员并登录
  if (users.length === 0 && bootstrap) {
    if (
      !constantTimeEqualStr(username, bootstrap.username) ||
      !constantTimeEqualStr(password, bootstrap.password)
    ) {
      return { ok: false as const, error: "用户名或密码错误" };
    }
    try {
      await createAuthUser({
        username: bootstrap.username,
        password: bootstrap.password,
        role: "admin",
      });
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "初始化管理员失败" };
    }
    const created = (await listAuthUsers()).find((u) => u.username === bootstrap.username);
    if (!created) return { ok: false as const, error: "初始化管理员失败" };
    await setSessionCookie(created.id, created.username, created.role);
    await writeAuditLog({
      action: "auth.bootstrap_admin",
      target: created.id,
      detail: { username: created.username },
    });
    return { ok: true as const };
  }

  const user = users.find((u) => u.username === username);
  if (!user || user.disabled) return { ok: false as const, error: "用户名或密码错误" };
  const pass = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!pass) return { ok: false as const, error: "用户名或密码错误" };
  await setSessionCookie(user.id, user.username, user.role);
  return { ok: true as const };
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_KEY);
  return { ok: true as const };
}

export async function getCurrentUserAction() {
  const session = await getCurrentAuthSession();
  return { user: session ? { userId: session.userId, username: session.username, role: session.role } : null };
}

export async function authBootstrapStatusAction() {
  const usersExist = await hasAuthUsers();
  const bootstrapConfigured = Boolean(getBootstrapAdminConfig());
  return { usersExist, bootstrapConfigured };
}

export async function listUsersAction() {
  const canManage = await hasCurrentUserPermission("users.manage");
  if (!canManage) return { ok: false as const, error: "仅管理员可查看用户列表" };
  const rows = await listAuthUsers();
  return { ok: true as const, users: safeUserRows(rows) };
}

export async function createUserAction(input: { username: string; password: string; role: string; permissions?: string[] | null }) {
  const role = mapRole(input.role);
  if (!role) return { ok: false as const, error: "无效角色" };
  const usersExist = await hasAuthUsers();
  if (!usersExist) {
    return {
      ok: false as const,
      error: "首个超级管理员须在 Cloudflare 中配置 BOOTSTRAP_ADMIN_PASSWORD 后在登录页完成初始化，无法在系统内创建首个账号。",
    };
  }
  const canManage = await hasCurrentUserPermission("users.manage");
  if (!canManage) {
    return { ok: false as const, error: "仅管理员可新增用户" };
  }
  try {
    const permissions = Array.isArray(input.permissions) ? normalizePermissionKeys(input.permissions) : null;
    const created = await createAuthUser({ username: input.username, password: input.password, role, permissions });
    await writeAuditLog({
      action: "users.create",
      target: created.id,
      detail: { username: created.username, role: created.role, permissions },
    });
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "创建用户失败" };
  }
}

export async function setUserRoleAction(input: { userId: string; role: string }) {
  const canManage = await hasCurrentUserPermission("users.manage");
  if (!canManage) return { ok: false as const, error: "仅管理员可修改角色" };
  const role = mapRole(input.role);
  if (!role) return { ok: false as const, error: "无效角色" };
  try {
    const users = await listAuthUsers();
    const next = users.map((u) => (u.id === input.userId ? { ...u, role } : u));
    ensureAtLeastOneManager(next);
    await updateAuthUserRole(input.userId, role);
    await writeAuditLog({
      action: "users.set_role",
      target: input.userId,
      detail: { role },
    });
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "修改角色失败" };
  }
}

export async function setUserPasswordAction(input: { userId: string; password: string }) {
  const canManage = await hasCurrentUserPermission("users.manage");
  if (!canManage) return { ok: false as const, error: "仅管理员可重置密码" };
  try {
    await updateAuthUserPassword(input.userId, input.password);
    await writeAuditLog({
      action: "users.reset_password",
      target: input.userId,
      detail: {},
    });
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "重置密码失败" };
  }
}

export async function setUserDisabledAction(input: { userId: string; disabled: boolean }) {
  const canManage = await hasCurrentUserPermission("users.manage");
  if (!canManage) return { ok: false as const, error: "仅管理员可启停用户" };
  try {
    const users = await listAuthUsers();
    const next = users.map((u) => (u.id === input.userId ? { ...u, disabled: input.disabled } : u));
    ensureAtLeastOneManager(next);
    await setAuthUserDisabled(input.userId, input.disabled);
    await writeAuditLog({
      action: "users.set_disabled",
      target: input.userId,
      detail: { disabled: input.disabled },
    });
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "更新用户状态失败" };
  }
}

export async function setUserPermissionsAction(input: { userId: string; permissions: string[] | null }) {
  const canManage = await hasCurrentUserPermission("users.manage");
  if (!canManage) return { ok: false as const, error: "仅管理员可修改权限" };
  try {
    const permissions = Array.isArray(input.permissions) ? normalizePermissionKeys(input.permissions) : null;
    const users = await listAuthUsers();
    const next = users.map((u) => (u.id === input.userId ? { ...u, permissions } : u));
    ensureAtLeastOneManager(next);
    await updateAuthUserPermissions(input.userId, permissions);
    await writeAuditLog({
      action: "users.set_permissions",
      target: input.userId,
      detail: { permissions },
    });
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "修改权限失败" };
  }
}
