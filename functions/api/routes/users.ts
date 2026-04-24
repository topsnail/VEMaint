import { Hono } from "hono";
import { validateBody } from "../lib/request";
import { hashPassword } from "../lib/password";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { createUser, deleteUser, listUsers, setUserDisabled, updateUserPassword, updateUserRole } from "../repositories/users";
import { jsonError, jsonOk } from "../lib/response";
import { normalizeUsername } from "../services/auth-users";
import type { AppEnv } from "../types";
import { writeOperationLog } from "../repositories/logs";
import { userCreateBodySchema, userDisabledBodySchema, userPasswordBodySchema, userRoleBodySchema } from "../lib/validation";
import { requireOpReason } from "../lib/op-reason";
import { buildLogMeta } from "../lib/log-meta";

export const usersRoute = new Hono<AppEnv>();
usersRoute.use("/api/users/*", requireAuth, permitPerm("user.manage"));
usersRoute.use("/api/users", requireAuth, permitPerm("user.manage"));

usersRoute.get("/api/users", async (c) => {
  const rows = await listUsers(c.env.DB);
  return jsonOk(c, { users: rows });
});

usersRoute.post("/api/users", async (c) => {
  const parsed = await validateBody(c, userCreateBodySchema, "参数错误");
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  const username = normalizeUsername(parsed.data.username);
  const password = parsed.data.password;
  const role = parsed.data.role;
  const passwordHash = await hashPassword(password);
  try {
    const id = await createUser(c.env.DB, { username, passwordHash, role });
    await writeOperationLog(c.env.DB, c.get("auth"), "user.create", id, { username, role }, buildLogMeta(c));
    return jsonOk(c, { ok: true, id }, 201);
  } catch {
    return jsonError(c, "CONFLICT", "用户名已存在", 409);
  }
});

usersRoute.put("/api/users/:id/role", async (c) => {
  const id = c.req.param("id").trim();
  const parsed = await validateBody(c, userRoleBodySchema, "参数错误");
  if (!id) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  const reasonCheck = requireOpReason(c);
  if (!reasonCheck.ok) return reasonCheck.response;
  const role = parsed.data.role;
  if (id === c.get("auth").userId) return jsonError(c, "BAD_REQUEST", "不允许修改自己的角色", 400);
  await updateUserRole(c.env.DB, id, role);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.role", id, { role }, buildLogMeta(c));
  return jsonOk(c, { ok: true });
});

usersRoute.put("/api/users/:id/password", async (c) => {
  const id = c.req.param("id").trim();
  const parsed = await validateBody(c, userPasswordBodySchema, "参数错误");
  if (!id) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  const reasonCheck = requireOpReason(c);
  if (!reasonCheck.ok) return reasonCheck.response;
  const password = parsed.data.password;
  const passwordHash = await hashPassword(password);
  await updateUserPassword(c.env.DB, id, passwordHash);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.password", id, null, buildLogMeta(c));
  return jsonOk(c, { ok: true });
});

usersRoute.put("/api/users/:id/disabled", async (c) => {
  const id = c.req.param("id").trim();
  const parsed = await validateBody(c, userDisabledBodySchema, "参数错误");
  if (!id) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  const reasonCheck = requireOpReason(c);
  if (!reasonCheck.ok) return reasonCheck.response;
  const disabled = parsed.data.disabled;
  if (id === c.get("auth").userId && disabled) return jsonError(c, "BAD_REQUEST", "不允许禁用当前登录账号", 400);
  await setUserDisabled(c.env.DB, id, disabled);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.disabled", id, { disabled }, buildLogMeta(c));
  return jsonOk(c, { ok: true });
});

usersRoute.delete("/api/users/:id", async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  const reasonCheck = requireOpReason(c);
  if (!reasonCheck.ok) return reasonCheck.response;
  if (id === c.get("auth").userId) return jsonError(c, "BAD_REQUEST", "不允许删除当前登录账号", 400);
  await deleteUser(c.env.DB, id);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.delete", id, null, buildLogMeta(c));
  return jsonOk(c, { ok: true });
});

