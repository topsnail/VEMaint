import { Hono } from "hono";
import type { Context } from "hono";
import { getNumberField, getTrimmedStringField, readJsonRecord } from "../lib/request";
import { jsonError, jsonOk } from "../lib/response";
import { normalizeRolePermissions } from "../lib/permissions";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { getSystemConfig, setSystemConfig } from "../services/config";
import type { AppEnv } from "../types";

export const configRoute = new Hono<AppEnv>();
configRoute.use("/api/system/config", requireAuth);
configRoute.use("/api/settings", requireAuth);

async function getConfigHandler(c: Context<AppEnv>) {
  const cfg = await getSystemConfig(c.env.KV);
  return jsonOk(c, { config: cfg });
}

async function putConfigHandler(c: Context<AppEnv>) {
  const body = await readJsonRecord(c);
  const siteName = getTrimmedStringField(body, "siteName");
  const warnDays = getNumberField(body, "warnDays", 7);
  const versionNote = getTrimmedStringField(body, "versionNote", "v1.0.0") || "v1.0.0";
  const dropdowns = body.dropdowns && typeof body.dropdowns === "object" ? (body.dropdowns as Record<string, string[]>) : {};
  const permissions = {
    roles: normalizeRolePermissions(body.permissions),
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
}

configRoute.get("/api/system/config", getConfigHandler);
configRoute.get("/api/settings", getConfigHandler);
configRoute.put("/api/system/config", permitPerm("config.manage"), putConfigHandler);
configRoute.put("/api/settings", permitPerm("config.manage"), putConfigHandler);

