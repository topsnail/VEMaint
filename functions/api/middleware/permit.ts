import { createMiddleware } from "hono/factory";
import { hasPermission, type PermissionKey } from "../lib/permissions";
import { jsonError } from "../lib/response";
import { getSystemConfig } from "../services/config";
import type { AppEnv, UserRole } from "../types";

export function permit(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const me = c.get("auth");
    if (!roles.includes(me.role)) return jsonError(c, "FORBIDDEN", "无权限", 403);
    await next();
  });
}

export function permitPerm(...perms: PermissionKey[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const me = c.get("auth");
    const cfg = await getSystemConfig(c.env.KV);
    const ok = perms.some((perm) => hasPermission(me.role, perm, cfg.permissions.roles));
    if (!ok) return jsonError(c, "FORBIDDEN", "无权限", 403);
    await next();
  });
}

