import type { Role } from "./lib/auth";

export type ApiUser = { userId: string; username: string; role: Role };

export type Vehicle = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type VehicleCycle = {
  id: string;
  vehicleId: string;
  insuranceType: string | null;
  insuranceVendor: string | null;
  insuranceStart: string | null;
  insuranceExpiry: string | null;
  insuranceAttachmentKey: string | null;
  annualLastDate: string | null;
  annualExpiry: string | null;
  maintLastDate: string | null;
  maintIntervalDays: number | null;
  maintIntervalKm: number | null;
  maintNextDate: string | null;
  maintNextKm: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceRecord = {
  id: string;
  targetType: "vehicle" | "equipment";
  vehicleId: string | null;
  equipmentName: string | null;
  maintenanceType: "routine" | "fault" | "accident" | "periodic";
  maintenanceDate: string;
  itemDesc: string;
  cost: number;
  vendor: string | null;
  parts: string | null;
  mileage: number | null;
  ownerUser: string;
  remark: string | null;
  attachmentKey: string | null;
  plateNo?: string;
  brandModel?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRow = {
  id: string;
  username: string;
  role: Role;
  disabled: number;
  created_at: string;
  updated_at: string;
};

