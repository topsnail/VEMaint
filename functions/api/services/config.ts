import { DEFAULT_ROLE_PERMISSIONS, normalizeRolePermissions, type RolePermissions } from "../lib/permissions";
import { safeJsonParse } from "../lib/safe-json";

const KEY = "sys:config:v1";

/** 车辆所有人与住址对照（用于台账录入时自动填住址） */
export type OwnerDirectoryEntry = { name: string; address: string };

export type SystemConfig = {
  siteName: string;
  warnDays: number;
  versionNote: string;
  dropdowns: Record<string, string[]>;
  ownerDirectory: OwnerDirectoryEntry[];
  permissions: {
    roles: RolePermissions;
  };
};

const DEFAULT_CONFIG: SystemConfig = {
  siteName: "VEMaint",
  warnDays: 7,
  versionNote: "v1.0.0",
  dropdowns: {
    vehicleType: ["轿车", "SUV", "客车", "货车", "面包车", "工程车", "特种车", "皮卡", "冷藏车", "危化品运输车", "公务用车", "其他"],
    energyType: ["汽油", "柴油", "纯电", "插电混动", "油电混动", "天然气", "氢能", "甲醇", "其他"],
    usageNature: ["营运", "非营运", "公务", "生产作业", "租赁", "货运", "通勤", "应急保障", "其他"],
    maintenanceType: ["日常保养", "故障维修", "事故维修", "定期检修"],
    ownerDept: ["综合办公室", "工程一部", "工程二部", "工程三部", "后勤保障部", "通勤车队", "仓储物流部", "销售部", "物流部", "质检中心", "安全管理部", "信息化部"],
    equipmentName: ["空压机", "发电机", "液压泵", "叉车", "升降机", "焊机", "水泵", "安防主机", "空调机组", "变频柜", "传送带", "除尘机", "喷涂机", "锅炉", "冷却塔"],
    equipmentType: ["动力设备", "液压设备", "搬运设备", "电气设备", "安防设备", "制冷设备", "传动设备", "环保设备", "公用设施", "其他"],
    equipmentCategory: ["生产", "保障", "检测", "安防", "行政", "环保", "能源", "仓储", "其他"],
  },
  ownerDirectory: [
    { name: "广东维保科技有限公司", address: "广州市黄埔区科学大道88号" },
    { name: "广东维保科技有限公司（总部）", address: "广州市天河区珠江新城冼村路28号" },
    { name: "工程一部", address: "广州市黄埔区开发区东区宏光路123号" },
    { name: "工程二部", address: "佛山市南海区桂城街道海八路18号" },
    { name: "工程三部", address: "东莞市南城区莞太路188号" },
    { name: "综合办公室", address: "广州市天河区体育东路66号" },
    { name: "仓储物流部", address: "惠州市惠城区江北文昌一路11号" },
    { name: "通勤车队", address: "中山市东区博爱路22号" },
    { name: "销售部", address: "广州市越秀区环市东路371号" },
    { name: "质检中心", address: "广州市黄埔区科丰路26号" },
    { name: "安全管理部", address: "广州市天河区龙口西路88号" },
    { name: "信息化部", address: "广州市海珠区新港中路397号" },
  ],
  permissions: { roles: DEFAULT_ROLE_PERMISSIONS },
};

export function normalizeOwnerDirectory(input: unknown): OwnerDirectoryEntry[] {
  if (!Array.isArray(input)) return [];
  const byName = new Map<string, string>();
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as { name?: unknown }).name ?? "").trim();
    const address = String((item as { address?: unknown }).address ?? "").trim();
    if (!name || !address) continue;
    byName.set(name, address);
  }
  return Array.from(byName.entries()).map(([name, address]) => ({ name, address }));
}

function normalizeDropdowns(input: unknown): Record<string, string[]> {
  if (!input || typeof input !== "object") return {};
  const obj = input as Record<string, unknown>;
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = key.trim();
    if (!cleanKey) continue;
    const arr = Array.isArray(value) ? value : [];
    const seen = new Set<string>();
    const options: string[] = [];
    for (const item of arr) {
      const text = String(item ?? "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      options.push(text);
    }
    if (options.length > 0) result[cleanKey] = options;
  }
  return result;
}

export async function getSystemConfig(kv: KVNamespace): Promise<SystemConfig> {
  const raw = await kv.get(KEY, "text");
  if (!raw) return DEFAULT_CONFIG;
  const parsed = safeJsonParse<Partial<SystemConfig>>(raw, { fallback: {} });
  return {
    siteName: typeof parsed.siteName === "string" && parsed.siteName.trim() ? parsed.siteName.trim() : "VEMaint",
    warnDays:
      typeof parsed.warnDays === "number" && Number.isFinite(parsed.warnDays)
        ? Math.max(1, Math.min(30, Math.round(parsed.warnDays)))
        : 7,
    versionNote: typeof parsed.versionNote === "string" && parsed.versionNote.trim() ? parsed.versionNote.trim() : "v1.0.0",
    dropdowns: normalizeDropdowns((parsed as { dropdowns?: unknown }).dropdowns),
    ownerDirectory: normalizeOwnerDirectory((parsed as { ownerDirectory?: unknown }).ownerDirectory),
    permissions: {
      roles: normalizeRolePermissions((parsed as { permissions?: unknown }).permissions),
    },
  };
}

export async function setSystemConfig(kv: KVNamespace, cfg: SystemConfig) {
  await kv.put(KEY, JSON.stringify(cfg));
}

