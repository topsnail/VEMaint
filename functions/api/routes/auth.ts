import { Hono } from "hono";
import { jsonError, jsonOk } from "../lib/response";
import { signAccessToken } from "../lib/jwt";
import { requireAuth } from "../middleware/require-auth";
import { normalizeUsername, verifyPassword, type AuthUser, loadUsers } from "../services/auth-users";

export const authRoute = new Hono();

authRoute.post("/api/auth/login", async (c) => {
  const body = await c.req.json().catch(() => null as unknown);
  const username = normalizeUsername((body as any)?.username ?? "");
  const password = String((body as any)?.password ?? "");
  if (!username || !password) return jsonError(c, "BAD_REQUEST", "请输入用户名和密码", 400);

  const users = await loadUsers(c.env.KV);
  const user = users.find((u) => u.username === username);
  if (!user || user.disabled) return jsonError(c, "INVALID_CREDENTIALS", "用户名或密码错误", 401);
  const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) return jsonError(c, "INVALID_CREDENTIALS", "用户名或密码错误", 401);

  const token = await signAccessToken(
    c.env,
    { sub: user.id, username: user.username, role: user.role },
    7 * 24 * 60 * 60,
  );
  return jsonOk(c, { token });
});

authRoute.get("/api/auth/me", requireAuth, async (c) => {
  const me = c.get("auth");
  return jsonOk(c, { userId: me.sub, username: me.username, role: me.role });
});

