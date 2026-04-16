import { Hono } from "hono";
import { getNullableTrimmedStringField, getNumberField, getOptionalNumberField, getTrimmedStringField, readJsonRecord } from "../lib/request";
import { jsonError, jsonOk } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { createVehicle, getVehicleById, listVehicles, setVehicleStatus, updateVehicle } from "../repositories/vehicles";
import { getCycleByVehicleId, upsertCycle } from "../repositories/cycles";
import { writeOperationLog } from "../repositories/logs";
import type { AppEnv } from "../types";

export const vehiclesRoute = new Hono<AppEnv>();
vehiclesRoute.use("/api/vehicles/*", requireAuth);
vehiclesRoute.use("/api/vehicles", requireAuth);

const VEHICLE_STATUSES = ["normal", "repairing", "scrapped", "stopped"] as const;
type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

function parseVehicleStatus(value: unknown, fallback: VehicleStatus = "normal"): VehicleStatus | null {
  const normalized = String(value ?? fallback).trim();
  return (VEHICLE_STATUSES as readonly string[]).includes(normalized) ? (normalized as VehicleStatus) : null;
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
  const body = await readJsonRecord(c);
  const plateNo = getTrimmedStringField(body, "plateNo").toUpperCase();
  const vehicleType = getTrimmedStringField(body, "vehicleType");
  const brandModel = getTrimmedStringField(body, "brandModel");
  const vin = getTrimmedStringField(body, "vin").toUpperCase();
  const engineNo = getTrimmedStringField(body, "engineNo");
  const regDate = getNullableTrimmedStringField(body, "regDate");
  const loadSpec = getNullableTrimmedStringField(body, "loadSpec");
  const usageNature = getNullableTrimmedStringField(body, "usageNature");
  const ownerDept = getTrimmedStringField(body, "ownerDept");
  const ownerPerson = getTrimmedStringField(body, "ownerPerson");
  const mileage = getNumberField(body, "mileage", 0);
  const purchaseDate = getNullableTrimmedStringField(body, "purchaseDate");
  const purchaseCost = getOptionalNumberField(body, "purchaseCost");
  const serviceLifeYears = getOptionalNumberField(body, "serviceLifeYears");
  const scrapDate = getNullableTrimmedStringField(body, "scrapDate");
  const disposalMethod = getNullableTrimmedStringField(body, "disposalMethod");
  const status = parseVehicleStatus(body.status);
  const remark = getNullableTrimmedStringField(body, "remark");
  if (!plateNo || !vehicleType || !brandModel || !vin || !engineNo || !ownerDept || !ownerPerson || !Number.isFinite(mileage))
    return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
  if (!status) return jsonError(c, "BAD_REQUEST", "车辆状态无效", 400);
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
  const body = await readJsonRecord(c);
  const plateNo = getTrimmedStringField(body, "plateNo").toUpperCase();
  const vehicleType = getTrimmedStringField(body, "vehicleType");
  const brandModel = getTrimmedStringField(body, "brandModel");
  const vin = getTrimmedStringField(body, "vin").toUpperCase();
  const engineNo = getTrimmedStringField(body, "engineNo");
  const regDate = getNullableTrimmedStringField(body, "regDate");
  const loadSpec = getNullableTrimmedStringField(body, "loadSpec");
  const usageNature = getNullableTrimmedStringField(body, "usageNature");
  const ownerDept = getTrimmedStringField(body, "ownerDept");
  const ownerPerson = getTrimmedStringField(body, "ownerPerson");
  const mileage = getNumberField(body, "mileage", 0);
  const purchaseDate = getNullableTrimmedStringField(body, "purchaseDate");
  const purchaseCost = getOptionalNumberField(body, "purchaseCost");
  const serviceLifeYears = getOptionalNumberField(body, "serviceLifeYears");
  const scrapDate = getNullableTrimmedStringField(body, "scrapDate");
  const disposalMethod = getNullableTrimmedStringField(body, "disposalMethod");
  const status = parseVehicleStatus(body.status);
  const remark = getNullableTrimmedStringField(body, "remark");
  if (!id || !plateNo || !vehicleType || !brandModel || !vin || !engineNo || !ownerDept || !ownerPerson || !Number.isFinite(mileage))
    return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
  if (!status) return jsonError(c, "BAD_REQUEST", "车辆状态无效", 400);
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
  const body = await readJsonRecord(c);
  const status = parseVehicleStatus(body.status, "normal");
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  if (!status) return jsonError(c, "BAD_REQUEST", "状态无效", 400);
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
  const body = await readJsonRecord(c);
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  await upsertCycle(c.env.DB, {
    vehicleId: id,
    insuranceType: getNullableTrimmedStringField(body, "insuranceType"),
    insuranceVendor: getNullableTrimmedStringField(body, "insuranceVendor"),
    insuranceStart: getNullableTrimmedStringField(body, "insuranceStart"),
    insuranceExpiry: getNullableTrimmedStringField(body, "insuranceExpiry"),
    insuranceAttachmentKey: getNullableTrimmedStringField(body, "insuranceAttachmentKey"),
    annualLastDate: getNullableTrimmedStringField(body, "annualLastDate"),
    annualExpiry: getNullableTrimmedStringField(body, "annualExpiry"),
    maintLastDate: getNullableTrimmedStringField(body, "maintLastDate"),
    maintIntervalDays: getOptionalNumberField(body, "maintIntervalDays"),
    maintIntervalKm: getOptionalNumberField(body, "maintIntervalKm"),
    maintNextDate: getNullableTrimmedStringField(body, "maintNextDate"),
    maintNextKm: getOptionalNumberField(body, "maintNextKm"),
  });
  await writeOperationLog(c.env.DB, c.get("auth"), "vehicle.cycle.update", id, null);
  return jsonOk(c, { ok: true });
});

