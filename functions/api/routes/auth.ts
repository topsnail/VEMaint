import { Hono } from "hono";
import type { Context } from "hono";
import { getTrimmedStringField, readJsonRecord } from "../lib/request";
import { jsonError, jsonOk } from "../lib/response";
import { revokeToken, signAccessToken } from "../lib/jwt";
import { requireAuth } from "../middleware/require-auth";
import { hashPassword, verifyPassword } from "../lib/password";
import { createUser, getUserByUsername, updateUserPassword } from "../repositories/users";
import { normalizeUsername } from "../services/auth-users";
import type { AppEnv } from "../types";
import { writeOperationLog } from "../repositories/logs";

export const authRoute = new Hono<AppEnv>();

async function loginHandler(c: Context<AppEnv>) {
  const body = await readJsonRecord(c);
  const username = normalizeUsername(getTrimmedStringField(body, "username"));
  const password = getTrimmedStringField(body, "password");
  if (!username || !password) return jsonError(c, "BAD_REQUEST", "请输入用户名和密码", 400);

  const user = await getUserByUsername(c.env.DB, username);
  if (!user) return jsonError(c, "INVALID_CREDENTIALS", "用户名或密码错误", 401);
  if (user.disabled) return jsonError(c, "FORBIDDEN", "账号已禁用", 403);
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return jsonError(c, "INVALID_CREDENTIALS", "用户名或密码错误", 401);

  const { token, csrfToken } = await signAccessToken(c.env, { userId: user.id, username: user.username, role: user.role });
  await writeOperationLog(c.env.DB, { userId: user.id, username: user.username, role: user.role, jti: "", csrfToken: "", exp: 0 }, "auth.login", user.id, null);
  return jsonOk(c, { token, csrfToken });
}

authRoute.post("/api/login", loginHandler);
authRoute.post("/api/auth/login", loginHandler);

async function meHandler(c: Context<AppEnv>) {
  const me = c.get("auth");
  return jsonOk(c, { userId: me.userId, username: me.username, role: me.role });
}

authRoute.get("/api/user/info", requireAuth, meHandler);
authRoute.get("/api/auth/me", requireAuth, meHandler);

authRoute.post("/api/logout", requireAuth, async (c) => {
  await revokeToken(c.env, c.get("auth"));
  await writeOperationLog(c.env.DB, c.get("auth"), "auth.logout", c.get("auth").userId, null);
  return jsonOk(c, { ok: true });
});

authRoute.post("/api/bootstrap", async (c) => {
  const admin = await getUserByUsername(c.env.DB, "admin");
  if (admin) return jsonError(c, "BOOTSTRAPPED", "系统已初始化", 400);
  const body = await readJsonRecord(c);
  const username = normalizeUsername(getTrimmedStringField(body, "username", "admin"));
  const password = getTrimmedStringField(body, "password");
  if (!username || !password) return jsonError(c, "BAD_REQUEST", "请提供用户名和密码", 400);
  const passwordHash = await hashPassword(password);
  await createUser(c.env.DB, { username, passwordHash, role: "admin" });
  return jsonOk(c, { ok: true }, 201);
});

authRoute.put("/api/profile/password", requireAuth, async (c) => {
  const me = c.get("auth");
  const body = await readJsonRecord(c);
  const oldPassword = getTrimmedStringField(body, "oldPassword");
  const newPassword = getTrimmedStringField(body, "newPassword");
  if (!oldPassword || !newPassword) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  const user = await getUserByUsername(c.env.DB, me.username);
  if (!user) return jsonError(c, "NOT_FOUND", "用户不存在", 404);
  const ok = await verifyPassword(oldPassword, user.password_hash);
  if (!ok) return jsonError(c, "BAD_REQUEST", "旧密码错误", 400);
  const hash = await hashPassword(newPassword);
  await updateUserPassword(c.env.DB, user.id, hash);
  await writeOperationLog(c.env.DB, me, "profile.password", me.userId, null);
  return jsonOk(c, { ok: true });
});

