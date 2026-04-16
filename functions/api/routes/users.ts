import { Hono } from "hono";
import { getBooleanField, getTrimmedStringField, readJsonRecord } from "../lib/request";
import { hashPassword } from "../lib/password";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { createUser, deleteUser, listUsers, setUserDisabled, updateUserPassword, updateUserRole } from "../repositories/users";
import { jsonError, jsonOk } from "../lib/response";
import { normalizeUsername, parseRole } from "../services/auth-users";
import type { AppEnv } from "../types";
import { writeOperationLog } from "../repositories/logs";

export const usersRoute = new Hono<AppEnv>();
usersRoute.use("/api/users/*", requireAuth, permitPerm("user.manage"));
usersRoute.use("/api/users", requireAuth, permitPerm("user.manage"));

usersRoute.get("/api/users", async (c) => {
  const rows = await listUsers(c.env.DB);
  return jsonOk(c, { users: rows });
});

usersRoute.post("/api/users", async (c) => {
  const body = await readJsonRecord(c);
  const username = normalizeUsername(getTrimmedStringField(body, "username"));
  const password = getTrimmedStringField(body, "password");
  const role = parseRole(body.role);
  if (!username || !password || !role) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  const passwordHash = await hashPassword(password);
  try {
    await createUser(c.env.DB, { username, passwordHash, role });
    await writeOperationLog(c.env.DB, c.get("auth"), "user.create", username, { role });
    return jsonOk(c, { ok: true }, 201);
  } catch {
    return jsonError(c, "CONFLICT", "用户名已存在", 409);
  }
});

usersRoute.put("/api/users/:id/role", async (c) => {
  const id = c.req.param("id").trim();
  const body = await readJsonRecord(c);
  const role = parseRole(body.role);
  if (!id || !role) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  if (id === c.get("auth").userId) return jsonError(c, "BAD_REQUEST", "不允许修改自己的角色", 400);
  await updateUserRole(c.env.DB, id, role);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.role", id, { role });
  return jsonOk(c, { ok: true });
});

usersRoute.put("/api/users/:id/password", async (c) => {
  const id = c.req.param("id").trim();
  const body = await readJsonRecord(c);
  const password = getTrimmedStringField(body, "password");
  if (!id || !password) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  const passwordHash = await hashPassword(password);
  await updateUserPassword(c.env.DB, id, passwordHash);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.password", id, null);
  return jsonOk(c, { ok: true });
});

usersRoute.put("/api/users/:id/disabled", async (c) => {
  const id = c.req.param("id").trim();
  const body = await readJsonRecord(c);
  const disabled = getBooleanField(body, "disabled");
  if (!id) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  if (id === c.get("auth").userId && disabled) return jsonError(c, "BAD_REQUEST", "不允许禁用当前登录账号", 400);
  await setUserDisabled(c.env.DB, id, disabled);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.disabled", id, { disabled });
  return jsonOk(c, { ok: true });
});

usersRoute.delete("/api/users/:id", async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  if (id === c.get("auth").userId) return jsonError(c, "BAD_REQUEST", "不允许删除当前登录账号", 400);
  await deleteUser(c.env.DB, id);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.delete", id, null);
  return jsonOk(c, { ok: true });
});

