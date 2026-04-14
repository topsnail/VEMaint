"use server";

import { desc, eq } from "drizzle-orm";
import { createDb } from "@/db";
import { vehicleLedgers } from "@/db/schema";
import { getCloudflareEnv } from "@/lib/cf-env";
import { canDeleteByRole, canWriteByRole } from "@/lib/authz";
import { getCurrentUserRole } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";

export type VehicleLedgerInput = {
  internalNo: string;
  plateNo: string;
  vehicleType: string;
  brandModel: string;
  vin: string;
  engineNo: string;
  registrationDate?: string;
  ownerName?: string;
  ownerAddress?: string;
  usageNature?: string;
  certificateIssueDate?: string;
  archiveNo?: string;
  ratedPassengers?: string;
  grossMass?: string;
  curbWeight?: string;
  overallDimensions?: string;
  fuelType: string;
  ratedLoad?: string;
  department?: string;
  defaultDriver?: string;
  parkingLocation?: string;
  insuranceCompany?: string;
  compulsoryInsuranceDue?: string;
  commercialInsuranceDue?: string;
  insuranceRemark?: string;
  annualInspectionDue?: string;
  emissionTestDate?: string;
  safetyPerformanceDate?: string;
  totalMileage?: string;
  lastServiceDate?: string;
  lastServiceMileage?: string;
  nextServiceDate?: string;
  nextServiceMileage?: string;
  tireChangedDate?: string;
  batteryChangedDate?: string;
  brakeChangedDate?: string;
  gearboxOilChangedDate?: string;
  usageStatus: string;
  commonFaults?: string;
  remark?: string;
};

function must(v: string | undefined, name: string) {
  if (!v?.trim()) throw new Error(`${name}必填`);
  return v.trim();
}

function validateTruckLoad(vehicleType: string, ratedLoad: string | undefined) {
  if (vehicleType.trim().includes("货车") && !ratedLoad?.trim()) {
    throw new Error("货车类型时「核定载重」必填");
  }
}

export async function listVehicleLedgers() {
  const { DB } = getCloudflareEnv();
  const db = createDb(DB);
  return db.select().from(vehicleLedgers).orderBy(desc(vehicleLedgers.createdAt));
}

export async function getVehicleLedgerById(idRaw: string) {
  const id = idRaw?.trim();
  if (!id) return null;
  const { DB } = getCloudflareEnv();
  const db = createDb(DB);
  const rows = await db.select().from(vehicleLedgers).where(eq(vehicleLedgers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createVehicleLedger(input: VehicleLedgerInput) {
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) return { ok: false as const, error: "只读模式不可新增" };
  try {
    const db = createDb(DB);
    validateTruckLoad(input.vehicleType, input.ratedLoad);
    const id = crypto.randomUUID();
    await db.insert(vehicleLedgers).values({
      id,
      internalNo: must(input.internalNo, "内部编号"),
      plateNo: must(input.plateNo, "号牌号码"),
      vehicleType: must(input.vehicleType, "车辆类型"),
      brandModel: must(input.brandModel, "品牌型号"),
      vin: must(input.vin, "车辆识别代号"),
      engineNo: must(input.engineNo, "发动机号"),
      registrationDate: input.registrationDate?.trim() || null,
      ownerName: input.ownerName?.trim() || null,
      ownerAddress: input.ownerAddress?.trim() || null,
      usageNature: input.usageNature?.trim() || null,
      certificateIssueDate: input.certificateIssueDate?.trim() || null,
      archiveNo: input.archiveNo?.trim() || null,
      ratedPassengers: input.ratedPassengers?.trim() || null,
      grossMass: input.grossMass?.trim() || null,
      curbWeight: input.curbWeight?.trim() || null,
      overallDimensions: input.overallDimensions?.trim() || null,
      fuelType: must(input.fuelType, "燃油类型"),
      ratedLoad: input.ratedLoad?.trim() || null,
      department: input.department?.trim() || null,
      defaultDriver: input.defaultDriver?.trim() || null,
      parkingLocation: input.parkingLocation?.trim() || null,
      insuranceCompany: input.insuranceCompany?.trim() || null,
      compulsoryInsuranceDue: input.compulsoryInsuranceDue?.trim() || null,
      commercialInsuranceDue: input.commercialInsuranceDue?.trim() || null,
      insuranceRemark: input.insuranceRemark?.trim() || null,
      annualInspectionDue: input.annualInspectionDue?.trim() || null,
      emissionTestDate: input.emissionTestDate?.trim() || null,
      safetyPerformanceDate: input.safetyPerformanceDate?.trim() || null,
      totalMileage: input.totalMileage?.trim() || null,
      lastServiceDate: input.lastServiceDate?.trim() || null,
      lastServiceMileage: input.lastServiceMileage?.trim() || null,
      nextServiceDate: input.nextServiceDate?.trim() || null,
      nextServiceMileage: input.nextServiceMileage?.trim() || null,
      tireChangedDate: input.tireChangedDate?.trim() || null,
      batteryChangedDate: input.batteryChangedDate?.trim() || null,
      brakeChangedDate: input.brakeChangedDate?.trim() || null,
      gearboxOilChangedDate: input.gearboxOilChangedDate?.trim() || null,
      usageStatus: input.usageStatus?.trim() || "正常使用",
      commonFaults: input.commonFaults?.trim() || null,
      remark: input.remark?.trim() || null,
    });
    revalidatePath("/vehicle-ledger");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function updateVehicleLedger(idRaw: string, input: VehicleLedgerInput) {
  const id = idRaw?.trim();
  if (!id) return { ok: false as const, error: "无效ID" };
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) return { ok: false as const, error: "只读模式不可编辑" };
  try {
    const db = createDb(DB);
    validateTruckLoad(input.vehicleType, input.ratedLoad);
    await db
      .update(vehicleLedgers)
      .set({
        internalNo: must(input.internalNo, "内部编号"),
        plateNo: must(input.plateNo, "号牌号码"),
        vehicleType: must(input.vehicleType, "车辆类型"),
        brandModel: must(input.brandModel, "品牌型号"),
        vin: must(input.vin, "车辆识别代号"),
        engineNo: must(input.engineNo, "发动机号"),
        registrationDate: input.registrationDate?.trim() || null,
        ownerName: input.ownerName?.trim() || null,
        ownerAddress: input.ownerAddress?.trim() || null,
        usageNature: input.usageNature?.trim() || null,
        certificateIssueDate: input.certificateIssueDate?.trim() || null,
        archiveNo: input.archiveNo?.trim() || null,
        ratedPassengers: input.ratedPassengers?.trim() || null,
        grossMass: input.grossMass?.trim() || null,
        curbWeight: input.curbWeight?.trim() || null,
        overallDimensions: input.overallDimensions?.trim() || null,
        fuelType: must(input.fuelType, "燃油类型"),
        ratedLoad: input.ratedLoad?.trim() || null,
        department: input.department?.trim() || null,
        defaultDriver: input.defaultDriver?.trim() || null,
        parkingLocation: input.parkingLocation?.trim() || null,
        insuranceCompany: input.insuranceCompany?.trim() || null,
        compulsoryInsuranceDue: input.compulsoryInsuranceDue?.trim() || null,
        commercialInsuranceDue: input.commercialInsuranceDue?.trim() || null,
        insuranceRemark: input.insuranceRemark?.trim() || null,
        annualInspectionDue: input.annualInspectionDue?.trim() || null,
        emissionTestDate: input.emissionTestDate?.trim() || null,
        safetyPerformanceDate: input.safetyPerformanceDate?.trim() || null,
        totalMileage: input.totalMileage?.trim() || null,
        lastServiceDate: input.lastServiceDate?.trim() || null,
        lastServiceMileage: input.lastServiceMileage?.trim() || null,
        nextServiceDate: input.nextServiceDate?.trim() || null,
        nextServiceMileage: input.nextServiceMileage?.trim() || null,
        tireChangedDate: input.tireChangedDate?.trim() || null,
        batteryChangedDate: input.batteryChangedDate?.trim() || null,
        brakeChangedDate: input.brakeChangedDate?.trim() || null,
        gearboxOilChangedDate: input.gearboxOilChangedDate?.trim() || null,
        usageStatus: input.usageStatus?.trim() || "正常使用",
        commonFaults: input.commonFaults?.trim() || null,
        remark: input.remark?.trim() || null,
      })
      .where(eq(vehicleLedgers.id, id));
    revalidatePath("/vehicle-ledger");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function deleteVehicleLedger(idRaw: string) {
  const id = idRaw?.trim();
  if (!id) return { ok: false as const, error: "无效ID" };
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canDeleteByRole(role)) return { ok: false as const, error: "仅管理员可删除" };
  const db = createDb(DB);
  await db.delete(vehicleLedgers).where(eq(vehicleLedgers.id, id));
  revalidatePath("/vehicle-ledger");
  return { ok: true as const };
}
