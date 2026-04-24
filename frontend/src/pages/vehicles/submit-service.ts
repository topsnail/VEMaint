type BuildVehicleSubmitPayloadArgs = {
  formValues: Record<string, unknown>;
  validatedValues: Record<string, unknown>;
  normalizedPlateNo: string;
  regDate: string;
  mergedLoadSpec: string;
  mergedUsageNature: string;
  mergedRemark: string;
};

type BuildCycleSubmitPayloadArgs = {
  insuranceType: string;
  insuranceVendor: string;
  insuranceStart: string;
  insuranceExpiry: string;
  insuranceAttachmentKey: string;
  annualLastDate: string;
  annualExpiry: string;
  maintLastDate: string;
  maintIntervalDays: number | null;
  maintIntervalKm: number | null;
  maintNextDate: string;
  maintNextKm: unknown;
};

export const buildMergedRemark = (args: {
  remark: unknown;
  archiveNo: unknown;
  ownerName: unknown;
  issueDate: string;
  ownerAddress: unknown;
  drivingLicenseAttachmentKey: string;
  drivingLicenseAttachmentKeys: string[];
  insuranceAllAttachmentKeys: string[];
  insuranceCompulsoryAttachmentKeys: string[];
  insuranceCommercialAttachmentKeys: string[];
}) => {
  return [
    args.remark,
    args.archiveNo ? `档案编号: ${args.archiveNo}` : "",
    args.ownerName ? `所有人: ${args.ownerName}` : "",
    args.issueDate ? `发证日期: ${args.issueDate}` : "",
    args.ownerAddress ? `住址: ${args.ownerAddress}` : "",
    args.drivingLicenseAttachmentKey ? `行驶证附件Key: ${args.drivingLicenseAttachmentKey}` : "",
    args.drivingLicenseAttachmentKeys.length > 0 ? `行驶证附件Keys: ${args.drivingLicenseAttachmentKeys.join("|")}` : "",
    args.insuranceAllAttachmentKeys.length > 0 ? `保单附件Keys: ${args.insuranceAllAttachmentKeys.join("|")}` : "",
    args.insuranceCompulsoryAttachmentKeys.length > 0 ? `交强险附件Keys: ${args.insuranceCompulsoryAttachmentKeys.join("|")}` : "",
    args.insuranceCommercialAttachmentKeys.length > 0 ? `商业险附件Keys: ${args.insuranceCommercialAttachmentKeys.join("|")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildVehicleSubmitPayload = (args: BuildVehicleSubmitPayloadArgs) => {
  return {
    ...args.validatedValues,
    ...args.formValues,
    plateNo: args.normalizedPlateNo,
    regDate: args.regDate || null,
    loadSpec: args.mergedLoadSpec || null,
    usageNature: args.mergedUsageNature || null,
    remark: args.mergedRemark || null,
  };
};

export const buildCycleSubmitPayload = (args: BuildCycleSubmitPayloadArgs) => {
  return {
    insuranceType: args.insuranceType || null,
    insuranceVendor: args.insuranceVendor || null,
    insuranceStart: args.insuranceStart || null,
    insuranceExpiry: args.insuranceExpiry || null,
    insuranceAttachmentKey: args.insuranceAttachmentKey || null,
    annualLastDate: args.annualLastDate || null,
    annualExpiry: args.annualExpiry || null,
    maintLastDate: args.maintLastDate || null,
    maintIntervalDays: args.maintIntervalDays ?? null,
    maintIntervalKm: args.maintIntervalKm ?? null,
    maintNextDate: args.maintNextDate || null,
    maintNextKm: (args.maintNextKm as number | null | undefined) ?? null,
  };
};
