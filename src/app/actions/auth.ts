"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { canManageUsers, parseUserRole, type UserRole } from "@/lib/authz";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { SESSION_COOKIE_KEY, signSession } from "@/lib/auth-token";
import { writeAuditLog } from "@/lib/audit";
import {
  createAuthUser,
  hasAuthUsers,
  listAuthUsers,
  normalizeUsername,
  setAuthUserDisabled,
  updateAuthUserPassword,
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
  }));
}

export async function loginAction(input: { username: string; password: string }) {
  const username = normalizeUsername(input.username);
  const password = input.password ?? "";
  if (!username || !password) return { ok: false as const, error: "请输入用户名和密码" };
  const users = await listAuthUsers();
  const user = users.find((u) => u.username === username);
  if (!user || user.disabled) return { ok: false as const, error: "用户名或密码错误" };
  const pass = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!pass) return { ok: false as const, error: "用户名或密码错误" };
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const token = await signSession({ userId: user.id, username: user.username, role: user.role, exp });
  const store = await cookies();
  store.set(SESSION_COOKIE_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
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
  return { usersExist };
}

export async function listUsersAction() {
  const session = await getCurrentAuthSession();
  if (!session || !canManageUsers(session.role)) return { ok: false as const, error: "仅管理员可查看用户列表" };
  const rows = await listAuthUsers();
  return { ok: true as const, users: safeUserRows(rows) };
}

export async function createUserAction(input: { username: string; password: string; role: string }) {
  const role = mapRole(input.role);
  if (!role) return { ok: false as const, error: "无效角色" };
  const usersExist = await hasAuthUsers();
  const session = await getCurrentAuthSession();
  if (usersExist && (!session || !canManageUsers(session.role))) {
    return { ok: false as const, error: "仅管理员可新增用户" };
  }
  try {
    const created = await createAuthUser({ username: input.username, password: input.password, role });
    await writeAuditLog({
      action: "users.create",
      target: created.id,
      detail: { username: created.username, role: created.role },
    });
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "创建用户失败" };
  }
}

export async function setUserRoleAction(input: { userId: string; role: string }) {
  const session = await getCurrentAuthSession();
  if (!session || !canManageUsers(session.role)) return { ok: false as const, error: "仅管理员可修改角色" };
  const role = mapRole(input.role);
  if (!role) return { ok: false as const, error: "无效角色" };
  try {
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
  const session = await getCurrentAuthSession();
  if (!session || !canManageUsers(session.role)) return { ok: false as const, error: "仅管理员可重置密码" };
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
  const session = await getCurrentAuthSession();
  if (!session || !canManageUsers(session.role)) return { ok: false as const, error: "仅管理员可启停用户" };
  try {
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
