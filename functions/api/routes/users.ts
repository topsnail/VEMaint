import { Hono } from "hono";
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
  const body = await c.req.json().catch(() => null as unknown);
  const username = normalizeUsername((body as any)?.username ?? "");
  const password = String((body as any)?.password ?? "");
  const role = parseRole((body as any)?.role);
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
  const body = await c.req.json().catch(() => null as unknown);
  const role = parseRole((body as any)?.role);
  if (!id || !role) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  await updateUserRole(c.env.DB, id, role);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.role", id, { role });
  return jsonOk(c, { ok: true });
});

usersRoute.put("/api/users/:id/password", async (c) => {
  const id = c.req.param("id").trim();
  const body = await c.req.json().catch(() => null as unknown);
  const password = String((body as any)?.password ?? "");
  if (!id || !password) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  const passwordHash = await hashPassword(password);
  await updateUserPassword(c.env.DB, id, passwordHash);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.password", id, null);
  return jsonOk(c, { ok: true });
});

usersRoute.put("/api/users/:id/disabled", async (c) => {
  const id = c.req.param("id").trim();
  const body = await c.req.json().catch(() => null as unknown);
  const disabled = Boolean((body as any)?.disabled);
  if (!id) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  await setUserDisabled(c.env.DB, id, disabled);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.disabled", id, { disabled });
  return jsonOk(c, { ok: true });
});

usersRoute.delete("/api/users/:id", async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "参数错误", 400);
  await deleteUser(c.env.DB, id);
  await writeOperationLog(c.env.DB, c.get("auth"), "user.delete", id, null);
  return jsonOk(c, { ok: true });
});

