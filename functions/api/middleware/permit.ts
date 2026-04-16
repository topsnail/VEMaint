import { createMiddleware } from "hono/factory";
import { jsonError } from "../lib/response";
import type { AppEnv, UserRole } from "../types";

export function permit(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const me = c.get("auth");
    if (!roles.includes(me.role)) return jsonError(c, "FORBIDDEN", "无权限", 403);
    await next();
  });
}

