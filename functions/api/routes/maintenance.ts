import { Hono } from "hono";
import { getNullableTrimmedStringField, getNumberField, getOptionalNumberField, readJsonRecord } from "../lib/request";
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

export const maintenanceRoute = new Hono<AppEnv>();
maintenanceRoute.use("/api/maintenance/*", requireAuth);
maintenanceRoute.use("/api/maintenance", requireAuth);

const MAINTENANCE_TARGET_TYPES = ["vehicle", "equipment"] as const;
const MAINTENANCE_TYPES = ["routine", "fault", "accident", "periodic"] as const;

function parseTargetType(value: unknown): (typeof MAINTENANCE_TARGET_TYPES)[number] | null {
  const normalized = String(value ?? "vehicle").trim();
  return (MAINTENANCE_TARGET_TYPES as readonly string[]).includes(normalized)
    ? (normalized as (typeof MAINTENANCE_TARGET_TYPES)[number])
    : null;
}

function parseMaintenanceType(value: unknown): (typeof MAINTENANCE_TYPES)[number] | null {
  const normalized = String(value ?? "routine").trim();
  return (MAINTENANCE_TYPES as readonly string[]).includes(normalized)
    ? (normalized as (typeof MAINTENANCE_TYPES)[number])
    : null;
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
  const body = await readJsonRecord(c);
  const targetType = parseTargetType(body.targetType);
  const vehicleId = getNullableTrimmedStringField(body, "vehicleId");
  const equipmentName = getNullableTrimmedStringField(body, "equipmentName");
  const maintenanceType = parseMaintenanceType(body.maintenanceType);
  const maintenanceDate = getNullableTrimmedStringField(body, "maintenanceDate") ?? "";
  const itemDesc = getNullableTrimmedStringField(body, "itemDesc") ?? "";
  const cost = getNumberField(body, "cost", 0);
  const vendor = getNullableTrimmedStringField(body, "vendor");
  const parts = getNullableTrimmedStringField(body, "parts");
  const mileage = getOptionalNumberField(body, "mileage");
  const remark = getNullableTrimmedStringField(body, "remark");
  const attachmentKey = getNullableTrimmedStringField(body, "attachmentKey");
  if (!targetType || !maintenanceType) return jsonError(c, "BAD_REQUEST", "维保类型参数无效", 400);
  if (!maintenanceDate || !itemDesc || !Number.isFinite(cost) || cost < 0) return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
  if (targetType === "vehicle" && !vehicleId) return jsonError(c, "BAD_REQUEST", "车辆维保必须选择车辆", 400);
  if (targetType === "equipment" && !equipmentName) return jsonError(c, "BAD_REQUEST", "设备维保必须填写设备名称", 400);
  if (targetType === "vehicle" && mileage === null) return jsonError(c, "BAD_REQUEST", "车辆维保必须填写里程", 400);
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
  await writeOperationLog(c.env.DB, c.get("auth"), "maintenance.create", id, { targetType, vehicleId, equipmentName });
  return jsonOk(c, { id }, 201);
});

maintenanceRoute.put("/api/maintenance/:id", permitPerm("maintenance.edit"), async (c) => {
  const id = c.req.param("id").trim();
  const body = await readJsonRecord(c);
  const targetType = parseTargetType(body.targetType);
  const vehicleId = getNullableTrimmedStringField(body, "vehicleId");
  const equipmentName = getNullableTrimmedStringField(body, "equipmentName");
  const maintenanceType = parseMaintenanceType(body.maintenanceType);
  const maintenanceDate = getNullableTrimmedStringField(body, "maintenanceDate") ?? "";
  const itemDesc = getNullableTrimmedStringField(body, "itemDesc") ?? "";
  const cost = getNumberField(body, "cost", 0);
  const vendor = getNullableTrimmedStringField(body, "vendor");
  const parts = getNullableTrimmedStringField(body, "parts");
  const mileage = getOptionalNumberField(body, "mileage");
  const remark = getNullableTrimmedStringField(body, "remark");
  const attachmentKey = getNullableTrimmedStringField(body, "attachmentKey");
  if (!targetType || !maintenanceType) return jsonError(c, "BAD_REQUEST", "维保类型参数无效", 400);
  if (!id || !maintenanceDate || !itemDesc || !Number.isFinite(cost) || cost < 0) return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
  if (targetType === "vehicle" && !vehicleId) return jsonError(c, "BAD_REQUEST", "车辆维保必须选择车辆", 400);
  if (targetType === "equipment" && !equipmentName) return jsonError(c, "BAD_REQUEST", "设备维保必须填写设备名称", 400);
  if (targetType === "vehicle" && mileage === null) return jsonError(c, "BAD_REQUEST", "车辆维保必须填写里程", 400);
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
  await writeOperationLog(c.env.DB, c.get("auth"), "maintenance.update", id, null);
  return jsonOk(c, { ok: true });
});

maintenanceRoute.delete("/api/maintenance/:id", permitPerm("maintenance.delete"), async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  await deleteMaintenance(c.env.DB, id);
  await writeOperationLog(c.env.DB, c.get("auth"), "maintenance.delete", id, null);
  return jsonOk(c, { ok: true });
});

