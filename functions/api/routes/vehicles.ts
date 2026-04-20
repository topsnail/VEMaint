import { Hono } from "hono";
import { validateBody } from "../lib/request";
import { jsonError, jsonOk } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { createVehicle, getVehicleById, listVehicles, setVehicleStatus, updateVehicle } from "../repositories/vehicles";
import { getCycleByVehicleId, upsertCycle } from "../repositories/cycles";
import { writeOperationLog } from "../repositories/logs";
import type { AppEnv } from "../types";
import { vehicleCycleUpsertBodySchema, vehicleStatusBodySchema, vehicleUpsertBodySchema } from "../lib/validation";

export const vehiclesRoute = new Hono<AppEnv>();
vehiclesRoute.use("/api/vehicles/*", requireAuth);
vehiclesRoute.use("/api/vehicles", requireAuth);

/**
 * 车牌规范化：统一大写并去掉常见分隔符/空白，便于去重与检索。
 */
function normalizePlateNo(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[·•\.\-\s]/g, "")
    .trim();
}

vehiclesRoute.get("/api/vehicles", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const rows = await listVehicles(c.env.DB, q);
  return jsonOk(c, { vehicles: rows });
});

vehiclesRoute.get("/api/vehicles/:id", async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  const row = await getVehicleById(c.env.DB, id);
  if (!row) return jsonError(c, "NOT_FOUND", "车辆不存在", 404);
  return jsonOk(c, { vehicle: row });
});

vehiclesRoute.post("/api/vehicles", permitPerm("vehicle.manage"), async (c) => {
  const parsed = await validateBody(c, vehicleUpsertBodySchema, "参数不完整");
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  const plateNo = normalizePlateNo(parsed.data.plateNo);
  const vehicleType = parsed.data.vehicleType;
  const brandModel = parsed.data.brandModel;
  const vin = parsed.data.vin.toUpperCase();
  const engineNo = parsed.data.engineNo;
  const regDate = parsed.data.regDate ?? null;
  const loadSpec = parsed.data.loadSpec ?? null;
  const usageNature = parsed.data.usageNature ?? null;
  const ownerDept = parsed.data.ownerDept;
  const ownerPerson = parsed.data.ownerPerson;
  const mileage = parsed.data.mileage;
  const purchaseDate = parsed.data.purchaseDate ?? null;
  const purchaseCost = parsed.data.purchaseCost ?? null;
  const serviceLifeYears = parsed.data.serviceLifeYears ?? null;
  const scrapDate = parsed.data.scrapDate ?? null;
  const disposalMethod = parsed.data.disposalMethod ?? null;
  const status = parsed.data.status;
  const remark = parsed.data.remark ?? null;
  try {
    const id = await createVehicle(c.env.DB, {
      plateNo,
      vehicleType,
      brandModel,
      vin,
      engineNo,
      regDate,
      loadSpec,
      usageNature,
      ownerDept,
      ownerPerson,
      mileage,
      purchaseDate,
      purchaseCost,
      serviceLifeYears,
      scrapDate,
      disposalMethod,
      status,
      remark,
    });
    await writeOperationLog(c.env.DB, c.get("auth"), "vehicle.create", id, { plateNo });
    return jsonOk(c, { id }, 201);
  } catch {
    return jsonError(c, "CONFLICT", "车牌号已存在", 409);
  }
});

vehiclesRoute.put("/api/vehicles/:id", permitPerm("vehicle.manage"), async (c) => {
  const id = c.req.param("id").trim();
  const parsed = await validateBody(c, vehicleUpsertBodySchema, "参数不完整");
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  if (!id) return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
  const plateNo = normalizePlateNo(parsed.data.plateNo);
  const vehicleType = parsed.data.vehicleType;
  const brandModel = parsed.data.brandModel;
  const vin = parsed.data.vin.toUpperCase();
  const engineNo = parsed.data.engineNo;
  const regDate = parsed.data.regDate ?? null;
  const loadSpec = parsed.data.loadSpec ?? null;
  const usageNature = parsed.data.usageNature ?? null;
  const ownerDept = parsed.data.ownerDept;
  const ownerPerson = parsed.data.ownerPerson;
  const mileage = parsed.data.mileage;
  const purchaseDate = parsed.data.purchaseDate ?? null;
  const purchaseCost = parsed.data.purchaseCost ?? null;
  const serviceLifeYears = parsed.data.serviceLifeYears ?? null;
  const scrapDate = parsed.data.scrapDate ?? null;
  const disposalMethod = parsed.data.disposalMethod ?? null;
  const status = parsed.data.status;
  const remark = parsed.data.remark ?? null;
  await updateVehicle(c.env.DB, id, {
    plateNo,
    vehicleType,
    brandModel,
    vin,
    engineNo,
    regDate,
    loadSpec,
    usageNature,
    ownerDept,
    ownerPerson,
    mileage,
    purchaseDate,
    purchaseCost,
    serviceLifeYears,
    scrapDate,
    disposalMethod,
    status,
    remark,
  });
  await writeOperationLog(c.env.DB, c.get("auth"), "vehicle.update", id, null);
  return jsonOk(c, { ok: true });
});

vehiclesRoute.put("/api/vehicles/:id/status", permitPerm("vehicle.manage"), async (c) => {
  const id = c.req.param("id").trim();
  const parsed = await validateBody(c, vehicleStatusBodySchema, "状态无效");
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  const status = parsed.data.status;
  await setVehicleStatus(c.env.DB, id, status);
  await writeOperationLog(c.env.DB, c.get("auth"), "vehicle.status", id, { status });
  return jsonOk(c, { ok: true });
});

vehiclesRoute.get("/api/vehicles/:id/cycles", async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  const cycle = await getCycleByVehicleId(c.env.DB, id);
  return jsonOk(c, { cycle });
});

vehiclesRoute.put("/api/vehicles/:id/cycles", permitPerm("maintenance.edit"), async (c) => {
  const id = c.req.param("id").trim();
  const parsed = await validateBody(c, vehicleCycleUpsertBodySchema, "参数不完整");
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  if (!parsed.ok) return jsonError(c, "BAD_REQUEST", parsed.message, 400);
  await upsertCycle(c.env.DB, {
    vehicleId: id,
    insuranceType: parsed.data.insuranceType ?? null,
    insuranceVendor: parsed.data.insuranceVendor ?? null,
    insuranceStart: parsed.data.insuranceStart ?? null,
    insuranceExpiry: parsed.data.insuranceExpiry ?? null,
    insuranceAttachmentKey: parsed.data.insuranceAttachmentKey ?? null,
    annualLastDate: parsed.data.annualLastDate ?? null,
    annualExpiry: parsed.data.annualExpiry ?? null,
    maintLastDate: parsed.data.maintLastDate ?? null,
    maintIntervalDays: parsed.data.maintIntervalDays ?? null,
    maintIntervalKm: parsed.data.maintIntervalKm ?? null,
    maintNextDate: parsed.data.maintNextDate ?? null,
    maintNextKm: parsed.data.maintNextKm ?? null,
  });
  await writeOperationLog(c.env.DB, c.get("auth"), "vehicle.cycle.update", id, null);
  return jsonOk(c, { ok: true });
});

