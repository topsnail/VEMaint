import { d1All, d1First, d1Run } from "../db/d1";
import type { Vehicle } from "../types";

type VehicleInput = {
  plateNo: string;
  vehicleType: string;
  brandModel: string;
  vin: string;
  engineNo: string;
  regDate: string | null;
  loadSpec: string | null;
  usageNature: string | null;
  ownerDept: string;
  ownerPerson: string;
  mileage: number;
  purchaseDate: string | null;
  purchaseCost: number | null;
  serviceLifeYears: number | null;
  scrapDate: string | null;
  disposalMethod: string | null;
  status: "normal" | "repairing" | "scrapped" | "stopped";
  remark: string | null;
};

export async function listVehicles(db: D1Database, q: string): Promise<Vehicle[]> {
  const keyword = `%${q}%`;
  return await d1All<Vehicle>(
    db,
    `
select id,
plate_no as plateNo, vehicle_type as vehicleType, brand_model as brandModel, vin, engine_no as engineNo, reg_date as regDate,
load_spec as loadSpec, usage_nature as usageNature, owner_dept as ownerDept, owner_person as ownerPerson, mileage, status,
purchase_date as purchaseDate, purchase_cost as purchaseCost, service_life_years as serviceLifeYears, scrap_date as scrapDate, disposal_method as disposalMethod,
remark, created_at as createdAt, updated_at as updatedAt
from vehicles
where (?1 = '' or plate_no like ?2 or brand_model like ?2 or owner_dept like ?2)
order by updated_at desc
`,
    [q, keyword],
  );
}

export async function getVehicleById(db: D1Database, id: string): Promise<Vehicle | null> {
  return await d1First<Vehicle>(
    db,
    `
select id,
plate_no as plateNo, vehicle_type as vehicleType, brand_model as brandModel, vin, engine_no as engineNo, reg_date as regDate,
load_spec as loadSpec, usage_nature as usageNature, owner_dept as ownerDept, owner_person as ownerPerson, mileage, status,
purchase_date as purchaseDate, purchase_cost as purchaseCost, service_life_years as serviceLifeYears, scrap_date as scrapDate, disposal_method as disposalMethod,
remark, created_at as createdAt, updated_at as updatedAt
from vehicles where id = ?1
`,
    [id],
  );
}

export async function createVehicle(db: D1Database, input: VehicleInput): Promise<string> {
  const id = crypto.randomUUID();
  await d1Run(
    db,
    "insert into vehicles (id, plate_no, vehicle_type, brand_model, vin, engine_no, reg_date, load_spec, usage_nature, owner_dept, owner_person, mileage, purchase_date, purchase_cost, service_life_years, scrap_date, disposal_method, status, remark, created_at, updated_at) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, datetime('now'), datetime('now'))",
    [
      id,
      input.plateNo,
      input.vehicleType,
      input.brandModel,
      input.vin,
      input.engineNo,
      input.regDate,
      input.loadSpec,
      input.usageNature,
      input.ownerDept,
      input.ownerPerson,
      input.mileage,
      input.purchaseDate,
      input.purchaseCost,
      input.serviceLifeYears,
      input.scrapDate,
      input.disposalMethod,
      input.status,
      input.remark,
    ],
  );
  return id;
}

export async function updateVehicle(db: D1Database, id: string, input: VehicleInput) {
  await d1Run(
    db,
    "update vehicles set plate_no = ?1, vehicle_type = ?2, brand_model = ?3, vin = ?4, engine_no = ?5, reg_date = ?6, load_spec = ?7, usage_nature = ?8, owner_dept = ?9, owner_person = ?10, mileage = ?11, purchase_date = ?12, purchase_cost = ?13, service_life_years = ?14, scrap_date = ?15, disposal_method = ?16, status = ?17, remark = ?18, updated_at = datetime('now') where id = ?19",
    [
      input.plateNo,
      input.vehicleType,
      input.brandModel,
      input.vin,
      input.engineNo,
      input.regDate,
      input.loadSpec,
      input.usageNature,
      input.ownerDept,
      input.ownerPerson,
      input.mileage,
      input.purchaseDate,
      input.purchaseCost,
      input.serviceLifeYears,
      input.scrapDate,
      input.disposalMethod,
      input.status,
      input.remark,
      id,
    ],
  );
}

export async function setVehicleStatus(db: D1Database, id: string, status: VehicleInput["status"]) {
  await d1Run(db, "update vehicles set status = ?1, updated_at = datetime('now') where id = ?2", [status, id]);
}

