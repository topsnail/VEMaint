import { Hono } from "hono";
import type { Context } from "hono";
import { validateBody } from "../lib/request";
import { jsonError, jsonOk } from "../lib/response";
import { normalizeRolePermissions } from "../lib/permissions";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { getSystemConfig, normalizeOwnerDirectory, setSystemConfig } from "../services/config";
import type { AppEnv } from "../types";
import { systemConfigBodySchema } from "../lib/validation";

export const configRoute = new Hono<AppEnv>();
configRoute.use("/api/system/config", requireAuth);
configRoute.use("/api/settings", requireAuth);

async function getConfigHandler(c: Context<AppEnv>) {
  const cfg = await getSystemConfig(c.env.KV);
  return jsonOk(c, { config: cfg });
}

async function putConfigHandler(c: Context<AppEnv>) {
  const parsed = await validateBody(c, systemConfigBodySchema, "siteName 不能为空");
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  const siteName = parsed.data.siteName;
  const warnDays = parsed.data.warnDays;
  const versionNote = parsed.data.versionNote || "v1.0.0";
  const dropdowns = parsed.data.dropdowns;
  const existing = await getSystemConfig(c.env.KV);
  const ownerDirectory =
    parsed.data.ownerDirectory !== undefined
      ? normalizeOwnerDirectory(parsed.data.ownerDirectory)
      : existing.ownerDirectory;
  const permissions = {
    roles: normalizeRolePermissions(parsed.data.permissions),
  };
  await setSystemConfig(c.env.KV, {
    siteName,
    warnDays: Number.isFinite(warnDays) ? Math.max(1, Math.min(30, Math.round(warnDays))) : 7,
    versionNote,
    dropdowns,
    ownerDirectory,
    permissions,
  });
  return jsonOk(c, { ok: true });
}

configRoute.get("/api/system/config", getConfigHandler);
configRoute.get("/api/settings", getConfigHandler);
configRoute.put("/api/system/config", permitPerm("config.manage"), putConfigHandler);
configRoute.put("/api/settings", permitPerm("config.manage"), putConfigHandler);

