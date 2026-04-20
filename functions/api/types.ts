import type { CloudflareEnv } from "../../env";

export type AppEnv = { Bindings: CloudflareEnv };

export type UserRole = "admin" | "maintainer" | "reader";

export type JwtUser = {
  userId: string;
  username: string;
  role: UserRole;
  jti: string;
  csrfToken: string;
  exp: number;
};

export type Vehicle = {
  id: string;
  plateNo: string; // unique
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
  targetType: "vehicle" | "equipment" | "other";
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
  createdAt: string;
  updatedAt: string;
};

export type OperationLog = {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  createdAt: string;
};

