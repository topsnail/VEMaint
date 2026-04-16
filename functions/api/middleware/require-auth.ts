import { createMiddleware } from "hono/factory";
import { jsonError } from "../lib/response";
import { verifyAccessToken } from "../lib/jwt";
import type { JwtUser } from "../types";
import type { AppEnv } from "../types";

declare module "hono" {
  interface ContextVariableMap {
    auth: JwtUser;
  }
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const hdr = c.req.header("authorization") ?? "";
  const m = hdr.match(/^Bearer\s+(.+)$/i);
  if (!m) return jsonError(c, "UNAUTHORIZED", "未登录", 401);
  const claims = await verifyAccessToken(c.env, m[1].trim());
  if (!claims) return jsonError(c, "UNAUTHORIZED", "登录已失效", 401);
  c.set("auth", claims);
  await next();
});

