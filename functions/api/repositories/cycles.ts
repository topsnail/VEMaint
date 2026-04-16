import { d1First, d1Run } from "../db/d1";
import type { VehicleCycle } from "../types";

type CycleInput = Omit<VehicleCycle, "id" | "createdAt" | "updatedAt">;

export async function getCycleByVehicleId(db: D1Database, vehicleId: string): Promise<VehicleCycle | null> {
  return await d1First<VehicleCycle>(
    db,
    `
select id, vehicle_id as vehicleId, insurance_type as insuranceType, insurance_vendor as insuranceVendor,
insurance_start as insuranceStart, insurance_expiry as insuranceExpiry, insurance_attachment_key as insuranceAttachmentKey,
annual_last_date as annualLastDate, annual_expiry as annualExpiry,
maint_last_date as maintLastDate, maint_interval_days as maintIntervalDays, maint_interval_km as maintIntervalKm,
maint_next_date as maintNextDate, maint_next_km as maintNextKm,
created_at as createdAt, updated_at as updatedAt
from vehicle_cycles where vehicle_id = ?1
`,
    [vehicleId],
  );
}

export async function upsertCycle(db: D1Database, input: CycleInput) {
  const exists = await d1First<{ id: string }>(db, "select id from vehicle_cycles where vehicle_id = ?1", [input.vehicleId]);
  if (exists?.id) {
    await d1Run(
      db,
      `update vehicle_cycles set insurance_type=?1,insurance_vendor=?2,insurance_start=?3,insurance_expiry=?4,insurance_attachment_key=?5,
annual_last_date=?6,annual_expiry=?7,maint_last_date=?8,maint_interval_days=?9,maint_interval_km=?10,maint_next_date=?11,maint_next_km=?12,updated_at=datetime('now')
where vehicle_id=?13`,
      [
        input.insuranceType,
        input.insuranceVendor,
        input.insuranceStart,
        input.insuranceExpiry,
        input.insuranceAttachmentKey,
        input.annualLastDate,
        input.annualExpiry,
        input.maintLastDate,
        input.maintIntervalDays,
        input.maintIntervalKm,
        input.maintNextDate,
        input.maintNextKm,
        input.vehicleId,
      ],
    );
    return exists.id;
  }
  const id = crypto.randomUUID();
  await d1Run(
    db,
    `insert into vehicle_cycles (
id,vehicle_id,insurance_type,insurance_vendor,insurance_start,insurance_expiry,insurance_attachment_key,annual_last_date,annual_expiry,
maint_last_date,maint_interval_days,maint_interval_km,maint_next_date,maint_next_km,created_at,updated_at
) values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,datetime('now'),datetime('now'))`,
    [
      id,
      input.vehicleId,
      input.insuranceType,
      input.insuranceVendor,
      input.insuranceStart,
      input.insuranceExpiry,
      input.insuranceAttachmentKey,
      input.annualLastDate,
      input.annualExpiry,
      input.maintLastDate,
      input.maintIntervalDays,
      input.maintIntervalKm,
      input.maintNextDate,
      input.maintNextKm,
    ],
  );
  return id;
}

