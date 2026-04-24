import dayjs from "dayjs";
import type { VehicleCycle } from "../../types";

export const MAX_ATTACHMENT_KEYS = 50;
export const VEHICLE_MODAL_SCROLL_WAIT_MS = 60;
export const VIN_LENGTH = 17;
export const DEFAULT_ANNUAL_INTERVAL_MONTHS = 12;
export const FORM_FOCUSABLE_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [role="combobox"], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
export const INSURANCE_SEG_SEP = "；";

export type InsuranceBundle = {
  compulsory: { vendor: string; start: string; expiry: string };
  commercial: { vendor: string; start: string; expiry: string };
};

export type FormValidationError = {
  message?: string;
  errorFields?: Array<{ name: string | string[]; errors: string[] }>;
};

export const toYmd = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof (value as { format?: (pattern: string) => string }).format === "function") {
    return (value as { format: (pattern: string) => string }).format("YYYY-MM-DD");
  }
  return "";
};

export const normalizePositiveInteger = (value: unknown): number | null => {
  const text = String(value ?? "").replace(/[^\d]/g, "").trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
};

const parseSegmentedInsurance = (raw: string | null | undefined, label: "交强险" | "商业险", allowFallback = false) => {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const match = text.match(new RegExp(`${label}\\s*:\\s*([^；]+)`));
  if (match?.[1]) return match[1].trim();
  if (allowFallback && !text.includes("交强险:") && !text.includes("商业险:")) return text;
  return "";
};

export const parseInsuranceBundle = (cycle: VehicleCycle | null | undefined): InsuranceBundle => {
  return {
    compulsory: {
      vendor: parseSegmentedInsurance(cycle?.insuranceVendor, "交强险", true),
      start: parseSegmentedInsurance(cycle?.insuranceStart, "交强险", true),
      expiry: parseSegmentedInsurance(cycle?.insuranceExpiry, "交强险", true),
    },
    commercial: {
      vendor: parseSegmentedInsurance(cycle?.insuranceVendor, "商业险"),
      start: parseSegmentedInsurance(cycle?.insuranceStart, "商业险"),
      expiry: parseSegmentedInsurance(cycle?.insuranceExpiry, "商业险"),
    },
  };
};

export const buildInsurancePayload = (v: Record<string, unknown>) => {
  const cv = String(v.insuranceCompulsoryVendor ?? "").trim();
  const cs = String(v.insuranceCompulsoryStart ?? "").trim();
  const ce = String(v.insuranceCompulsoryExpiry ?? "").trim();
  const mv = String(v.insuranceCommercialVendor ?? "").trim();
  const ms = String(v.insuranceCommercialStart ?? "").trim();
  const me = String(v.insuranceCommercialExpiry ?? "").trim();
  const hasCompulsory = !!(cv || cs || ce);
  const hasCommercial = !!(mv || ms || me);
  return {
    hasCompulsory,
    hasCommercial,
    insuranceType: [hasCompulsory ? "交强险" : "", hasCommercial ? "商业险" : ""].filter(Boolean).join(" / "),
    insuranceVendor: [hasCompulsory ? `交强险:${cv}` : "", hasCommercial ? `商业险:${mv}` : ""].filter(Boolean).join(INSURANCE_SEG_SEP),
    insuranceStart: [hasCompulsory ? `交强险:${cs}` : "", hasCommercial ? `商业险:${ms}` : ""].filter(Boolean).join(INSURANCE_SEG_SEP),
    insuranceExpiry: [hasCompulsory ? `交强险:${ce}` : "", hasCommercial ? `商业险:${me}` : ""].filter(Boolean).join(INSURANCE_SEG_SEP),
  };
};

export const calcAnnualExpiry = (lastDate: string, months: number) => {
  const base = dayjs(lastDate, "YYYY-MM-DD", true);
  if (!base.isValid() || !Number.isFinite(months) || months < 1) return "";
  return base.add(months, "month").format("YYYY-MM-DD");
};

export const tabByFieldKey = (key: string): "basic" | "insurance" | "annual" | "maint" => {
  if (key.startsWith("insurance")) return "insurance";
  if (key.startsWith("annual")) return "annual";
  if (key.startsWith("maint")) return "maint";
  return "basic";
};

export const normalizePlateNo = (value: unknown) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[·•\.\-\s]/g, "")
    .trim();

export const isAfterOrEqual = (start: string, end: string) => {
  const left = dayjs(start, "YYYY-MM-DD", true);
  const right = dayjs(end, "YYYY-MM-DD", true);
  return left.isValid() && right.isValid() && (right.isSame(left, "day") || right.isAfter(left, "day"));
};

export const validateVehicleCoreInputs = (args: {
  plateNo: string;
  vin: string;
  engineNo: string;
  currentMileage: number;
  nextMaintKm: number;
}) => {
  if (args.plateNo.length < 6) return "号牌号码格式不正确";
  if (args.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(args.vin)) return `车辆识别代号需为${VIN_LENGTH}位字母数字（不含 I/O/Q）`;
  if (args.engineNo && args.engineNo.length < 4) return "发动机号至少 4 位";
  if (Number.isFinite(args.currentMileage) && Number.isFinite(args.nextMaintKm) && args.nextMaintKm > 0 && args.nextMaintKm < args.currentMileage) {
    return "下次保养里程不能小于本次保养里程";
  }
  return null;
};

export const validateInsuranceDraft = (args: {
  hasCompulsory: boolean;
  hasCommercial: boolean;
  compulsoryVendor: string;
  compulsoryStart: string;
  compulsoryExpiry: string;
  commercialVendor: string;
  commercialStart: string;
  commercialExpiry: string;
}) => {
  if (!args.hasCompulsory && !args.hasCommercial) return "请至少填写一种保险（交强险或商业险）";
  if (args.hasCompulsory) {
    if (!args.compulsoryVendor || !args.compulsoryStart || !args.compulsoryExpiry) return "交强险请填写完整：保险公司、投保日期、到期日期";
    if (!isAfterOrEqual(args.compulsoryStart, args.compulsoryExpiry)) return "交强险到期日期不能早于投保日期";
  }
  if (args.hasCommercial) {
    if (!args.commercialVendor || !args.commercialStart || !args.commercialExpiry) return "商业险请填写完整：保险公司、投保日期、到期日期";
    if (!isAfterOrEqual(args.commercialStart, args.commercialExpiry)) return "商业险到期日期不能早于投保日期";
  }
  return null;
};

export const validateCycleInputs = (args: {
  annualLastDate: string;
  annualExpiry: string;
  maintLastDate: string;
  maintNextDate: string;
  maintIntervalDays: number | null;
  maintIntervalKm: number | null;
}) => {
  if (args.annualLastDate && args.annualExpiry && !isAfterOrEqual(args.annualLastDate, args.annualExpiry)) return "年审到期日不能早于上次审车日期";
  if (args.maintLastDate && args.maintNextDate && !isAfterOrEqual(args.maintLastDate, args.maintNextDate)) return "下次保养日期不能早于上次保养日期";
  if (args.maintIntervalDays !== null && args.maintIntervalDays < 1) return "保养间隔天数需大于或等于 1";
  if (args.maintIntervalKm !== null && args.maintIntervalKm < 1) return "保养间隔里程需大于或等于 1";
  return null;
};
