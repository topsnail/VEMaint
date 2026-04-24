import { Hono, type Context } from "hono";
import { validateBody } from "../lib/request";
import { jsonError, jsonOk } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import {
  createMaintenance,
  deleteMaintenance,
  getMaintenanceById,
  listMaintenance,
  updateMaintenance,
} from "../repositories/maintenance";
import { writeOperationLog } from "../repositories/logs";
import type { AppEnv } from "../types";
import { maintenanceUpsertBodySchema } from "../lib/validation";
import { requireOpReason } from "../lib/op-reason";

export const maintenanceRoute = new Hono<AppEnv>();
maintenanceRoute.use("/api/maintenance/*", requireAuth);
maintenanceRoute.use("/api/maintenance", requireAuth);

function getLogMeta(c: Context<AppEnv>) {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  const userAgent = c.req.header("user-agent") ?? null;
  const reason = (c.req.header("x-op-reason") ?? "").trim() || null;
  return { ip, userAgent, reason };
}

maintenanceRoute.get("/api/maintenance", async (c) => {
  const rows = await listMaintenance(c.env.DB, {
    vehicleId: (c.req.query("vehicleId") ?? "").trim(),
    from: (c.req.query("from") ?? "").trim(),
    to: (c.req.query("to") ?? "").trim(),
    q: (c.req.query("q") ?? "").trim(),
  });
  return jsonOk(c, { records: rows });
});

maintenanceRoute.get("/api/maintenance/:id", async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  const row = await getMaintenanceById(c.env.DB, id);
  if (!row) return jsonError(c, "NOT_FOUND", "记录不存在", 404);
  return jsonOk(c, { record: row });
});

maintenanceRoute.post("/api/maintenance", permitPerm("maintenance.edit"), async (c) => {
  const parsed = await validateBody(c, maintenanceUpsertBodySchema, "参数不完整");
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  const targetType = parsed.data.targetType;
  const vehicleId = parsed.data.vehicleId ?? null;
  const equipmentName = parsed.data.equipmentName ?? null;
  const maintenanceType = parsed.data.maintenanceType;
  const maintenanceDate = parsed.data.maintenanceDate;
  const itemDesc = parsed.data.itemDesc;
  const cost = parsed.data.cost;
  const vendor = parsed.data.vendor ?? null;
  const parts = parsed.data.parts ?? null;
  const mileage = parsed.data.mileage ?? null;
  const remark = parsed.data.remark ?? null;
  const attachmentKey = parsed.data.attachmentKey ?? null;
  const id = await createMaintenance(c.env.DB, {
    targetType,
    vehicleId,
    equipmentName,
    maintenanceType,
    maintenanceDate,
    itemDesc,
    cost,
    vendor,
    parts,
    mileage,
    ownerUser: c.get("auth").username,
    remark,
    attachmentKey,
  });
  await writeOperationLog(c.env.DB, c.get("auth"), "maintenance.create", id, { targetType, vehicleId, equipmentName }, getLogMeta(c));
  return jsonOk(c, { id }, 201);
});

maintenanceRoute.put("/api/maintenance/:id", permitPerm("maintenance.edit"), async (c) => {
  const id = c.req.param("id").trim();
  const parsed = await validateBody(c, maintenanceUpsertBodySchema, "参数不完整");
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  if (!id) return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
  const targetType = parsed.data.targetType;
  const vehicleId = parsed.data.vehicleId ?? null;
  const equipmentName = parsed.data.equipmentName ?? null;
  const maintenanceType = parsed.data.maintenanceType;
  const maintenanceDate = parsed.data.maintenanceDate;
  const itemDesc = parsed.data.itemDesc;
  const cost = parsed.data.cost;
  const vendor = parsed.data.vendor ?? null;
  const parts = parsed.data.parts ?? null;
  const mileage = parsed.data.mileage ?? null;
  const remark = parsed.data.remark ?? null;
  const attachmentKey = parsed.data.attachmentKey ?? null;
  await updateMaintenance(c.env.DB, id, {
    targetType,
    vehicleId,
    equipmentName,
    maintenanceType,
    maintenanceDate,
    itemDesc,
    cost,
    vendor,
    parts,
    mileage,
    ownerUser: c.get("auth").username,
    remark,
    attachmentKey,
  });
  await writeOperationLog(c.env.DB, c.get("auth"), "maintenance.update", id, null, getLogMeta(c));
  return jsonOk(c, { ok: true });
});

maintenanceRoute.delete("/api/maintenance/:id", permitPerm("maintenance.delete"), async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  const reasonCheck = requireOpReason(c);
  if (!reasonCheck.ok) return reasonCheck.response;
  await deleteMaintenance(c.env.DB, id);
  await writeOperationLog(c.env.DB, c.get("auth"), "maintenance.delete", id, null, getLogMeta(c));
  return jsonOk(c, { ok: true });
});

