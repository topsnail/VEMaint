import { Hono } from "hono";
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
  const body = await c.req.json().catch(() => null as unknown);
  const plateNo = String((body as any)?.plateNo ?? "").trim().toUpperCase();
  const vehicleType = String((body as any)?.vehicleType ?? "").trim();
  const brandModel = String((body as any)?.brandModel ?? "").trim();
  const vin = String((body as any)?.vin ?? "").trim().toUpperCase();
  const engineNo = String((body as any)?.engineNo ?? "").trim();
  const regDate = String((body as any)?.regDate ?? "").trim() || null;
  const loadSpec = String((body as any)?.loadSpec ?? "").trim() || null;
  const usageNature = String((body as any)?.usageNature ?? "").trim() || null;
  const ownerDept = String((body as any)?.ownerDept ?? "").trim();
  const ownerPerson = String((body as any)?.ownerPerson ?? "").trim();
  const mileage = Number((body as any)?.mileage ?? 0);
  const purchaseDate = String((body as any)?.purchaseDate ?? "").trim() || null;
  const purchaseCost = Number.isFinite(Number((body as any)?.purchaseCost)) ? Number((body as any)?.purchaseCost) : null;
  const serviceLifeYears = Number.isFinite(Number((body as any)?.serviceLifeYears)) ? Number((body as any)?.serviceLifeYears) : null;
  const scrapDate = String((body as any)?.scrapDate ?? "").trim() || null;
  const disposalMethod = String((body as any)?.disposalMethod ?? "").trim() || null;
  const status = String((body as any)?.status ?? "normal").trim() as any;
  const remark = String((body as any)?.remark ?? "").trim() || null;
  if (!plateNo || !vehicleType || !brandModel || !vin || !engineNo || !ownerDept || !ownerPerson || !Number.isFinite(mileage))
    return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
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
  const body = await c.req.json().catch(() => null as unknown);
  const plateNo = String((body as any)?.plateNo ?? "").trim().toUpperCase();
  const vehicleType = String((body as any)?.vehicleType ?? "").trim();
  const brandModel = String((body as any)?.brandModel ?? "").trim();
  const vin = String((body as any)?.vin ?? "").trim().toUpperCase();
  const engineNo = String((body as any)?.engineNo ?? "").trim();
  const regDate = String((body as any)?.regDate ?? "").trim() || null;
  const loadSpec = String((body as any)?.loadSpec ?? "").trim() || null;
  const usageNature = String((body as any)?.usageNature ?? "").trim() || null;
  const ownerDept = String((body as any)?.ownerDept ?? "").trim();
  const ownerPerson = String((body as any)?.ownerPerson ?? "").trim();
  const mileage = Number((body as any)?.mileage ?? 0);
  const purchaseDate = String((body as any)?.purchaseDate ?? "").trim() || null;
  const purchaseCost = Number.isFinite(Number((body as any)?.purchaseCost)) ? Number((body as any)?.purchaseCost) : null;
  const serviceLifeYears = Number.isFinite(Number((body as any)?.serviceLifeYears)) ? Number((body as any)?.serviceLifeYears) : null;
  const scrapDate = String((body as any)?.scrapDate ?? "").trim() || null;
  const disposalMethod = String((body as any)?.disposalMethod ?? "").trim() || null;
  const status = String((body as any)?.status ?? "normal").trim() as any;
  const remark = String((body as any)?.remark ?? "").trim() || null;
  if (!id || !plateNo || !vehicleType || !brandModel || !vin || !engineNo || !ownerDept || !ownerPerson || !Number.isFinite(mileage))
    return jsonError(c, "BAD_REQUEST", "参数不完整", 400);
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
  const body = await c.req.json().catch(() => null as unknown);
  const status = String((body as any)?.status ?? "").trim() as "normal" | "repairing" | "scrapped" | "stopped";
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  if (!status) return jsonError(c, "BAD_REQUEST", "状态不能为空", 400);
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
  const body = await c.req.json().catch(() => null as unknown);
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  await upsertCycle(c.env.DB, {
    vehicleId: id,
    insuranceType: String((body as any)?.insuranceType ?? "").trim() || null,
    insuranceVendor: String((body as any)?.insuranceVendor ?? "").trim() || null,
    insuranceStart: String((body as any)?.insuranceStart ?? "").trim() || null,
    insuranceExpiry: String((body as any)?.insuranceExpiry ?? "").trim() || null,
    insuranceAttachmentKey: String((body as any)?.insuranceAttachmentKey ?? "").trim() || null,
    annualLastDate: String((body as any)?.annualLastDate ?? "").trim() || null,
    annualExpiry: String((body as any)?.annualExpiry ?? "").trim() || null,
    maintLastDate: String((body as any)?.maintLastDate ?? "").trim() || null,
    maintIntervalDays: Number.isFinite(Number((body as any)?.maintIntervalDays))
      ? Number((body as any)?.maintIntervalDays)
      : null,
    maintIntervalKm: Number.isFinite(Number((body as any)?.maintIntervalKm))
      ? Number((body as any)?.maintIntervalKm)
      : null,
    maintNextDate: String((body as any)?.maintNextDate ?? "").trim() || null,
    maintNextKm: Number.isFinite(Number((body as any)?.maintNextKm)) ? Number((body as any)?.maintNextKm) : null,
  });
  await writeOperationLog(c.env.DB, c.get("auth"), "vehicle.cycle.update", id, null);
  return jsonOk(c, { ok: true });
});

