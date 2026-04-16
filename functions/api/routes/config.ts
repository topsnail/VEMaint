import { Hono } from "hono";
import { jsonError, jsonOk } from "../lib/response";
import { normalizeRolePermissions } from "../lib/permissions";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { getSystemConfig, setSystemConfig } from "../services/config";
import type { AppEnv } from "../types";

export const configRoute = new Hono<AppEnv>();
configRoute.use("/api/system/config", requireAuth);
configRoute.use("/api/settings", requireAuth);

configRoute.get("/api/system/config", async (c) => {
  const cfg = await getSystemConfig(c.env.KV);
  return jsonOk(c, { config: cfg });
});
configRoute.get("/api/settings", async (c) => {
  const cfg = await getSystemConfig(c.env.KV);
  return jsonOk(c, { config: cfg });
});

configRoute.put("/api/system/config", permitPerm("config.manage"), async (c) => {
  const body = await c.req.json().catch(() => null as unknown);
  const siteName = String((body as any)?.siteName ?? "").trim();
  const warnDays = Number((body as any)?.warnDays ?? 7);
  const versionNote = String((body as any)?.versionNote ?? "").trim() || "v1.0.0";
  const dropdowns = ((body as any)?.dropdowns ?? {}) as Record<string, string[]>;
  const permissions = {
    roles: normalizeRolePermissions((body as any)?.permissions),
  };
  if (!siteName) return jsonError(c, "BAD_REQUEST", "siteName 不能为空", 400);
  await setSystemConfig(c.env.KV, {
    siteName,
    warnDays: Number.isFinite(warnDays) ? Math.max(1, Math.min(30, Math.round(warnDays))) : 7,
    versionNote,
    dropdowns,
    permissions,
  });
  return jsonOk(c, { ok: true });
});

configRoute.put("/api/settings", permitPerm("config.manage"), async (c) => {
  const body = await c.req.json().catch(() => null as unknown);
  const siteName = String((body as any)?.siteName ?? "").trim();
  const warnDays = Number((body as any)?.warnDays ?? 7);
  const versionNote = String((body as any)?.versionNote ?? "").trim() || "v1.0.0";
  const dropdowns = ((body as any)?.dropdowns ?? {}) as Record<string, string[]>;
  const permissions = {
    roles: normalizeRolePermissions((body as any)?.permissions),
  };
  if (!siteName) return jsonError(c, "BAD_REQUEST", "siteName 不能为空", 400);
  await setSystemConfig(c.env.KV, {
    siteName,
    warnDays: Number.isFinite(warnDays) ? Math.max(1, Math.min(30, Math.round(warnDays))) : 7,
    versionNote,
    dropdowns,
    permissions,
  });
  return jsonOk(c, { ok: true });
});

