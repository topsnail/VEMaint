import type { VehicleLedgerInput } from "@/app/actions/vehicle-ledger";

export const FUEL_TYPES = ["汽油", "柴油", "电动", "混动"] as const;
export const USAGE_STATUS = ["正常使用", "维修中", "停用", "待报废"] as const;

/** 与行驶证/登记证常见填写顺序一致：号牌 → 类型 → … → 外廓尺寸 */
export const VEHICLE_LEDGER_EMPTY: VehicleLedgerInput = {
  plateNo: "",
  vehicleType: "轿车",
  ownerName: "",
  ownerAddress: "",
  usageNature: "",
  brandModel: "",
  vin: "",
  engineNo: "",
  registrationDate: "",
  certificateIssueDate: "",
  archiveNo: "",
  ratedPassengers: "",
  grossMass: "",
  curbWeight: "",
  overallDimensions: "",
  internalNo: "",
  fuelType: "汽油",
  ratedLoad: "",
  department: "",
  defaultDriver: "",
  parkingLocation: "",
  insuranceCompany: "",
  compulsoryInsuranceDue: "",
  commercialInsuranceDue: "",
  insuranceRemark: "",
  annualInspectionDue: "",
  emissionTestDate: "",
  safetyPerformanceDate: "",
  totalMileage: "",
  lastServiceDate: "",
  lastServiceMileage: "",
  nextServiceDate: "",
  nextServiceMileage: "",
  tireChangedDate: "",
  batteryChangedDate: "",
  brakeChangedDate: "",
  gearboxOilChangedDate: "",
  usageStatus: "正常使用",
  commonFaults: "",
  remark: "",
};

export const VEHICLE_CERTIFICATE_TEXT_FIELDS: {
  key: keyof VehicleLedgerInput;
  label: string;
  type?: "text" | "date";
  /** 输入框右侧显示的单位（与行驶证常见标注一致） */
  unit?: string;
}[] = [
  { key: "ownerName", label: "所有人", type: "text" },
  { key: "ownerAddress", label: "住址", type: "text" },
  { key: "brandModel", label: "品牌型号*", type: "text" },
  { key: "vin", label: "车辆识别代号*", type: "text" },
  { key: "engineNo", label: "发动机号*", type: "text" },
  { key: "registrationDate", label: "注册日期", type: "date" },
  { key: "certificateIssueDate", label: "发证日期", type: "date" },
  { key: "archiveNo", label: "档案编号", type: "text" },
  { key: "ratedPassengers", label: "核定载人数", type: "text", unit: "人" },
  { key: "grossMass", label: "总质量", type: "text", unit: "kg" },
  { key: "curbWeight", label: "整备质量", type: "text", unit: "kg" },
];

/** 将存库的 overallDimensions 解析为长、宽、高三段（仅填数字，× 由程序拼接） */
export function parseOverallDimensionsMm(raw: string | undefined): [string, string, string] {
  const empty: [string, string, string] = ["", "", ""];
  if (!raw?.trim()) return empty;
  const t = raw.trim();
  if (/[×xX*﹡]/.test(t)) {
    const parts = t.split(/[×xX*﹡]/).map((s) => s.trim());
    return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
  }
  const nums = t.split(/\s+/).filter(Boolean);
  return [nums[0] ?? "", nums[1] ?? "", nums[2] ?? ""];
}

/** 三段数字拼接为存库字符串，空段保留位置（如 5995××3100） */
export function joinOverallDimensionsMm(a: string, b: string, c: string): string {
  const parts = [a, b, c].map((s) => s.trim());
  if (!parts.some(Boolean)) return "";
  return parts.join("×");
}

/** 详情页展示：长 × 宽 × 高（mm） */
export function formatOverallDimensionsForDetail(raw: string | undefined): string {
  if (!raw?.trim()) return "—";
  const [l, w, h] = parseOverallDimensionsMm(raw);
  const p = [l, w, h].map((x) => x.trim() || "—");
  return `${p[0]} × ${p[1]} × ${p[2]}（mm）`;
}

export const VEHICLE_OPERATIONS_TEXT_FIELDS: { key: keyof VehicleLedgerInput; label: string; type?: "text" | "date" }[] = [
  { key: "internalNo", label: "内部编号*", type: "text" },
  { key: "ratedLoad", label: "核定载重", type: "text" },
  { key: "department", label: "所属部门", type: "text" },
  { key: "defaultDriver", label: "常用驾驶人", type: "text" },
  { key: "parkingLocation", label: "停放位置", type: "text" },
  { key: "insuranceCompany", label: "保险公司", type: "text" },
  { key: "compulsoryInsuranceDue", label: "交强险到期", type: "date" },
  { key: "commercialInsuranceDue", label: "商业险到期", type: "date" },
  { key: "annualInspectionDue", label: "年检到期", type: "date" },
  { key: "emissionTestDate", label: "环保检测日期", type: "date" },
  { key: "safetyPerformanceDate", label: "安全性能检测日期", type: "date" },
  { key: "totalMileage", label: "当前累计里程", type: "text" },
  { key: "lastServiceDate", label: "上次保养日期", type: "date" },
  { key: "lastServiceMileage", label: "上次保养里程", type: "text" },
  { key: "nextServiceDate", label: "下次建议保养日期", type: "date" },
  { key: "nextServiceMileage", label: "下次建议保养里程", type: "text" },
  { key: "tireChangedDate", label: "轮胎最后更换日期", type: "date" },
  { key: "batteryChangedDate", label: "电瓶最后更换日期", type: "date" },
  { key: "brakeChangedDate", label: "刹车片/油更换日期", type: "date" },
  { key: "gearboxOilChangedDate", label: "变速箱/后桥油更换", type: "date" },
];

export const VEHICLE_DETAIL_LINES: {
  label: string;
  keys: (keyof VehicleLedgerInput)[];
  separator?: string;
  fallback?: string;
}[] = [
  { label: "号牌号码", keys: ["plateNo"] },
  { label: "车辆类型/燃油", keys: ["vehicleType", "fuelType"], separator: " / " },
  { label: "所有人", keys: ["ownerName"], fallback: "—" },
  { label: "住址", keys: ["ownerAddress"], fallback: "—" },
  { label: "使用性质", keys: ["usageNature"], fallback: "—" },
  { label: "品牌型号", keys: ["brandModel"] },
  { label: "车辆识别代号/发动机号", keys: ["vin", "engineNo"], separator: " / " },
  { label: "注册日期", keys: ["registrationDate"], fallback: "—" },
  { label: "发证日期", keys: ["certificateIssueDate"], fallback: "—" },
  { label: "档案编号", keys: ["archiveNo"], fallback: "—" },
  { label: "核定载人数", keys: ["ratedPassengers"], fallback: "—" },
  { label: "总质量/整备质量", keys: ["grossMass", "curbWeight"], separator: " / ", fallback: "— / —" },
  { label: "外廓尺寸", keys: ["overallDimensions"], fallback: "—" },
  { label: "内部编号", keys: ["internalNo"] },
  { label: "核定载重", keys: ["ratedLoad"], fallback: "—" },
  { label: "部门/驾驶人", keys: ["department", "defaultDriver"], separator: " / ", fallback: "— / —" },
  { label: "停放位置", keys: ["parkingLocation"], fallback: "—" },
  { label: "使用状态", keys: ["usageStatus"] },
  { label: "保险公司", keys: ["insuranceCompany"], fallback: "—" },
  { label: "交强险到期", keys: ["compulsoryInsuranceDue"], fallback: "—" },
  { label: "商业险到期", keys: ["commercialInsuranceDue"], fallback: "—" },
  { label: "险种备注", keys: ["insuranceRemark"], fallback: "—" },
  { label: "年检到期", keys: ["annualInspectionDue"], fallback: "—" },
  { label: "环保检测日期", keys: ["emissionTestDate"], fallback: "—" },
  { label: "安全性能检测日期", keys: ["safetyPerformanceDate"], fallback: "—" },
  { label: "累计里程", keys: ["totalMileage"], fallback: "—" },
  { label: "下次保养", keys: ["nextServiceDate", "nextServiceMileage"], separator: " / ", fallback: "— / —" },
  { label: "轮胎更换", keys: ["tireChangedDate"], fallback: "—" },
  { label: "电瓶更换", keys: ["batteryChangedDate"], fallback: "—" },
  { label: "刹车片/油更换", keys: ["brakeChangedDate"], fallback: "—" },
  { label: "变速箱/后桥油更换", keys: ["gearboxOilChangedDate"], fallback: "—" },
  { label: "历史故障", keys: ["commonFaults"], fallback: "—" },
  { label: "备注", keys: ["remark"], fallback: "—" },
];

/** 含「货车」的类型需填核定载重（兼容设置中自定义车种名） */
export function isTruckType(vehicleType: string) {
  const t = vehicleType.trim();
  return t.includes("货车");
}
