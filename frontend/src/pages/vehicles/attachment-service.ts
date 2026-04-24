import type { Vehicle } from "../../types";

type AttachmentSource = "insuranceCompulsory" | "insuranceCommercial" | "driving" | "other";

type ParsedMeta = {
  remarkBody: string;
  archiveNo: string;
  ownerName: string;
  issueDate: string;
  ownerAddress: string;
  drivingLicenseAttachmentKeys: string[];
  drivingLicenseAttachmentKey: string;
  insuranceAttachmentKeys: string[];
  insuranceCompulsoryAttachmentKeys: string[];
  insuranceCommercialAttachmentKeys: string[];
};

export const computeNextAttachmentMeta = (
  parsed: ParsedMeta,
  source: AttachmentSource,
  normalizedNextKeys: string[],
  normalizeAttachmentKeys: (keys: Array<string | null | undefined>) => string[],
): {
  nextCompulsoryKeys: string[];
  nextCommercialKeys: string[];
  nextAllInsuranceKeys: string[];
  nextMeta: ParsedMeta;
} => {
  const nextCompulsoryKeys = source === "insuranceCompulsory" ? normalizedNextKeys : parsed.insuranceCompulsoryAttachmentKeys;
  const nextCommercialKeys = source === "insuranceCommercial" ? normalizedNextKeys : parsed.insuranceCommercialAttachmentKeys;
  const nextAllInsuranceKeys = normalizeAttachmentKeys([...nextCompulsoryKeys, ...nextCommercialKeys]);

  return {
    nextCompulsoryKeys,
    nextCommercialKeys,
    nextAllInsuranceKeys,
    nextMeta: {
      ...parsed,
      drivingLicenseAttachmentKeys:
        source === "driving" ? normalizedNextKeys : parsed.drivingLicenseAttachmentKeys,
      drivingLicenseAttachmentKey:
        source === "driving" ? (normalizedNextKeys[0] || "") : parsed.drivingLicenseAttachmentKey,
      insuranceAttachmentKeys: nextAllInsuranceKeys,
      insuranceCompulsoryAttachmentKeys: nextCompulsoryKeys,
      insuranceCommercialAttachmentKeys: nextCommercialKeys,
    },
  };
};

export const buildVehicleRemarkUpsertPayload = (vehicle: Vehicle, nextRemark: string | null) => {
  return {
    plateNo: vehicle.plateNo,
    vehicleType: vehicle.vehicleType,
    brandModel: vehicle.brandModel,
    vin: vehicle.vin,
    engineNo: vehicle.engineNo,
    regDate: vehicle.regDate,
    loadSpec: vehicle.loadSpec,
    usageNature: vehicle.usageNature,
    ownerDept: vehicle.ownerDept,
    ownerPerson: vehicle.ownerPerson,
    mileage: vehicle.mileage,
    purchaseDate: vehicle.purchaseDate,
    purchaseCost: vehicle.purchaseCost,
    serviceLifeYears: vehicle.serviceLifeYears,
    scrapDate: vehicle.scrapDate,
    disposalMethod: vehicle.disposalMethod,
    status: vehicle.status,
    remark: nextRemark,
  };
};
