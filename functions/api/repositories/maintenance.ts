import { d1All, d1First, d1Run } from "../db/d1";
import type { MaintenanceRecord } from "../types";

type MaintenanceListRow = MaintenanceRecord & { plateNo: string | null; brandModel: string | null };

export async function listMaintenance(
  db: D1Database,
  filters: { vehicleId: string; from: string; to: string; q: string },
): Promise<MaintenanceListRow[]> {
  const qLike = `%${filters.q}%`;
  return await d1All<MaintenanceListRow>(
    db,
    `
select m.id,m.target_type as targetType,m.vehicle_id as vehicleId,m.equipment_name as equipmentName,m.maintenance_type as maintenanceType,m.maintenance_date as maintenanceDate,m.item_desc as itemDesc,m.cost,m.vendor,m.parts,m.mileage,m.owner_user as ownerUser,m.remark,m.attachment_key as attachmentKey,m.created_at as createdAt,m.updated_at as updatedAt,
v.plate_no as plateNo,v.brand_model as brandModel
from maintenance_records m left join vehicles v on v.id = m.vehicle_id
where (?1 = '' or ifnull(m.vehicle_id,'') = ?1)
  and (?2 = '' or m.maintenance_date >= ?2)
  and (?3 = '' or m.maintenance_date <= ?3)
  and (?4 = '' or ifnull(v.plate_no,'') like ?5 or m.item_desc like ?5 or ifnull(m.vendor,'') like ?5 or ifnull(m.equipment_name,'') like ?5)
order by m.maintenance_date desc, m.updated_at desc
`,
    [filters.vehicleId, filters.from, filters.to, filters.q, qLike],
  );
}

export async function getMaintenanceById(db: D1Database, id: string): Promise<MaintenanceRecord | null> {
  return await d1First<MaintenanceRecord>(
    db,
    "select id,target_type as targetType,vehicle_id as vehicleId,equipment_name as equipmentName,maintenance_type as maintenanceType,maintenance_date as maintenanceDate,item_desc as itemDesc,cost,vendor,parts,mileage,owner_user as ownerUser,remark,attachment_key as attachmentKey,created_at as createdAt,updated_at as updatedAt from maintenance_records where id = ?1",
    [id],
  );
}

export async function createMaintenance(
  db: D1Database,
  input: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const id = crypto.randomUUID();
  await d1Run(
    db,
    "insert into maintenance_records (id, target_type, vehicle_id, equipment_name, maintenance_type, maintenance_date, item_desc, cost, vendor, parts, mileage, owner_user, remark, attachment_key, created_at, updated_at) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, datetime('now'), datetime('now'))",
    [
      id,
      input.targetType,
      input.vehicleId,
      input.equipmentName,
      input.maintenanceType,
      input.maintenanceDate,
      input.itemDesc,
      input.cost,
      input.vendor,
      input.parts,
      input.mileage,
      input.ownerUser,
      input.remark,
      input.attachmentKey,
    ],
  );
  return id;
}

export async function updateMaintenance(
  db: D1Database,
  id: string,
  input: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">,
) {
  await d1Run(
    db,
    "update maintenance_records set target_type = ?1, vehicle_id = ?2, equipment_name = ?3, maintenance_type = ?4, maintenance_date = ?5, item_desc = ?6, cost = ?7, vendor = ?8, parts = ?9, mileage = ?10, owner_user = ?11, remark = ?12, attachment_key = ?13, updated_at = datetime('now') where id = ?14",
    [
      input.targetType,
      input.vehicleId,
      input.equipmentName,
      input.maintenanceType,
      input.maintenanceDate,
      input.itemDesc,
      input.cost,
      input.vendor,
      input.parts,
      input.mileage,
      input.ownerUser,
      input.remark,
      input.attachmentKey,
      id,
    ],
  );
}

export async function deleteMaintenance(db: D1Database, id: string) {
  await d1Run(db, "delete from maintenance_records where id = ?1", [id]);
}

