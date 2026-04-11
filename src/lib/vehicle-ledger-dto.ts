import type { VehicleLedgerInput } from "@/app/actions/vehicle-ledger";

export type VehicleLedgerRow = { id: string } & VehicleLedgerInput;

/** 将 D1 行映射为前端台账行（空字段统一为 ""） */
export function vehicleLedgerRowFromDb(r: {
  id: string;
  internalNo: string;
  plateNo: string;
  vehicleType: string;
  brandModel: string;
  vin: string;
  engineNo: string;
  registrationDate: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  usageNature: string | null;
  certificateIssueDate: string | null;
  archiveNo: string | null;
  ratedPassengers: string | null;
  grossMass: string | null;
  curbWeight: string | null;
  overallDimensions: string | null;
  fuelType: string;
  ratedLoad: string | null;
  department: string | null;
  defaultDriver: string | null;
  parkingLocation: string | null;
  insuranceCompany: string | null;
  compulsoryInsuranceDue: string | null;
  commercialInsuranceDue: string | null;
  insuranceRemark: string | null;
  annualInspectionDue: string | null;
  emissionTestDate: string | null;
  safetyPerformanceDate: string | null;
  totalMileage: string | null;
  lastServiceDate: string | null;
  lastServiceMileage: string | null;
  nextServiceDate: string | null;
  nextServiceMileage: string | null;
  tireChangedDate: string | null;
  batteryChangedDate: string | null;
  brakeChangedDate: string | null;
  gearboxOilChangedDate: string | null;
  usageStatus: string;
  commonFaults: string | null;
  remark: string | null;
}): VehicleLedgerRow {
  return {
    id: r.id,
    internalNo: r.internalNo,
    plateNo: r.plateNo,
    vehicleType: r.vehicleType,
    brandModel: r.brandModel,
    vin: r.vin,
    engineNo: r.engineNo,
    registrationDate: r.registrationDate ?? "",
    ownerName: r.ownerName ?? "",
    ownerAddress: r.ownerAddress ?? "",
    usageNature: r.usageNature ?? "",
    certificateIssueDate: r.certificateIssueDate ?? "",
    archiveNo: r.archiveNo ?? "",
    ratedPassengers: r.ratedPassengers ?? "",
    grossMass: r.grossMass ?? "",
    curbWeight: r.curbWeight ?? "",
    overallDimensions: r.overallDimensions ?? "",
    fuelType: r.fuelType,
    ratedLoad: r.ratedLoad ?? "",
    department: r.department ?? "",
    defaultDriver: r.defaultDriver ?? "",
    parkingLocation: r.parkingLocation ?? "",
    insuranceCompany: r.insuranceCompany ?? "",
    compulsoryInsuranceDue: r.compulsoryInsuranceDue ?? "",
    commercialInsuranceDue: r.commercialInsuranceDue ?? "",
    insuranceRemark: r.insuranceRemark ?? "",
    annualInspectionDue: r.annualInspectionDue ?? "",
    emissionTestDate: r.emissionTestDate ?? "",
    safetyPerformanceDate: r.safetyPerformanceDate ?? "",
    totalMileage: r.totalMileage ?? "",
    lastServiceDate: r.lastServiceDate ?? "",
    lastServiceMileage: r.lastServiceMileage ?? "",
    nextServiceDate: r.nextServiceDate ?? "",
    nextServiceMileage: r.nextServiceMileage ?? "",
    tireChangedDate: r.tireChangedDate ?? "",
    batteryChangedDate: r.batteryChangedDate ?? "",
    brakeChangedDate: r.brakeChangedDate ?? "",
    gearboxOilChangedDate: r.gearboxOilChangedDate ?? "",
    usageStatus: r.usageStatus,
    commonFaults: r.commonFaults ?? "",
    remark: r.remark ?? "",
  };
}
