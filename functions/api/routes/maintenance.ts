import { Hono } from "hono";
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
  const body = await c.req.json().catch(() => null as unknown);
  const targetType = String((body as any)?.targetType ?? "vehicle").trim() as "vehicle" | "equipment";
  const vehicleId = String((body as any)?.vehicleId ?? "").trim() || null;
  const equipmentName = String((body as any)?.equipmentName ?? "").trim() || null;
  const maintenanceType = String((body as any)?.maintenanceType ?? "routine").trim() as
    | "routine"
    | "fault"
    | "accident"
    | "periodic";
  const maintenanceDate = String((body as any)?.maintenanceDate ?? "").trim();
  const itemDesc = String((body as any)?.itemDesc ?? "").trim();
  const cost = Number((body as any)?.cost ?? 0);
  const vendor = String((body as any)?.vendor ?? "").trim() || null;
  const parts = String((body as any)?.parts ?? "").trim() || null;
  const mileage = Number.isFinite(Number((body as any)?.mileage)) ? Number((body as any)?.mileage) : null;
  const remark = String((body as any)?.remark ?? "").trim() || null;
  const attachmentKey = String((body as any)?.attachmentKey ?? "").trim() || null;
  if (!maintenanceDate || !itemDesc || !Number.isFinite(cost)) return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
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
  const body = await c.req.json().catch(() => null as unknown);
  const targetType = String((body as any)?.targetType ?? "vehicle").trim() as "vehicle" | "equipment";
  const vehicleId = String((body as any)?.vehicleId ?? "").trim() || null;
  const equipmentName = String((body as any)?.equipmentName ?? "").trim() || null;
  const maintenanceType = String((body as any)?.maintenanceType ?? "routine").trim() as
    | "routine"
    | "fault"
    | "accident"
    | "periodic";
  const maintenanceDate = String((body as any)?.maintenanceDate ?? "").trim();
  const itemDesc = String((body as any)?.itemDesc ?? "").trim();
  const cost = Number((body as any)?.cost ?? 0);
  const vendor = String((body as any)?.vendor ?? "").trim() || null;
  const parts = String((body as any)?.parts ?? "").trim() || null;
  const mileage = Number.isFinite(Number((body as any)?.mileage)) ? Number((body as any)?.mileage) : null;
  const remark = String((body as any)?.remark ?? "").trim() || null;
  const attachmentKey = String((body as any)?.attachmentKey ?? "").trim() || null;
  if (!id || !maintenanceDate || !itemDesc || !Number.isFinite(cost)) return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
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

