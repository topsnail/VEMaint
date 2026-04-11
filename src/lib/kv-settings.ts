export const KV_APP_SETTINGS_KEY = "app:settings";

export type AppSettings = {
  /** KV 可覆盖的维保类型列表；空则使用默认六种 */
  maintenanceKinds: string[];
  /** 维保项目分类（如车辆 / 设备 / 检测仪器 / 其他），供业务侧下拉或筛选 */
  maintenanceProjects: string[];
  /**
   * 维保项目子分类：键为一级项目名称，值为该级下的细类（逗号列表在表单中编辑）。
   * KV 若显式存 `"maintenanceProjectChildren": {}` 表示用户清空子类，不再自动补默认。
   */
  maintenanceProjectChildren: Record<string, string[]>;
  /** 预警任务类型推荐（用于下拉；仍支持自由输入） */
  reminderTaskTypes: string[];
  /** 仪表盘预警进度条窗口（天） */
  reminderWindowDays: number;
  /** 每类提醒的提前天数规则，如 { 年审: 60, 保险: 45 } */
  reminderLeadDaysByType: Record<string, number>;
  /** 轻量权限模式：admin | employee | viewer */
  roleMode: "admin" | "employee" | "viewer";
  /** 车辆台账「车辆类型」下拉选项（KV 可覆盖） */
  ledgerVehicleTypes: string[];
  /** 车辆台账「使用性质」下拉选项（行驶证字段；KV 可覆盖） */
  ledgerUsageNatures: string[];
};

export const DEFAULT_MAINTENANCE_KINDS: string[] = [
  "保险",
  "年审",
  "保养",
  "维修",
  "换件",
  "检修",
];

export const DEFAULT_MAINTENANCE_PROJECTS: string[] = ["车辆", "设备", "检测仪器", "其他"];

/** 车辆台账默认类型（与原先硬编码一致） */
export const DEFAULT_LEDGER_VEHICLE_TYPES: string[] = ["轿车", "SUV", "轻型货车", "重型货车", "检测车"];

/** 车辆台账「使用性质」常见选项（可按单位行驶证习惯在设置中改） */
export const DEFAULT_LEDGER_USAGE_NATURES: string[] = [
  "非营运",
  "营运",
  "营转非",
  "教练",
  "货运",
  "租赁",
  "危化品运输",
  "警用",
  "其他",
];

/** 一级项目默认子类（可与现场调整；「其他」通常不设子类） */
export const DEFAULT_MAINTENANCE_PROJECT_CHILDREN: Record<string, string[]> = {
  车辆: ["货车", "小车"],
  设备: ["发电机", "注浆机"],
  检测仪器: ["弯沉", "DCP", "CCTV"],
};

function defaultChildrenForProjects(projects: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const p of projects) {
    const list = DEFAULT_MAINTENANCE_PROJECT_CHILDREN[p];
    if (list?.length) out[p] = [...list];
  }
  return out;
}

function normalizeProjectChildren(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = k.trim();
    if (!key) continue;
    if (!Array.isArray(v)) continue;
    const list = v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
    out[key] = list;
  }
  return out;
}

function filterChildrenToParents(
  children: Record<string, string[]>,
  parents: string[],
): Record<string, string[]> {
  const set = new Set(parents);
  return Object.fromEntries(Object.entries(children).filter(([k]) => set.has(k)));
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  maintenanceKinds: [...DEFAULT_MAINTENANCE_KINDS],
  maintenanceProjects: [...DEFAULT_MAINTENANCE_PROJECTS],
  maintenanceProjectChildren: defaultChildrenForProjects(DEFAULT_MAINTENANCE_PROJECTS),
  reminderTaskTypes: ["年审", "保险", "保养", "维修", "检修"],
  reminderWindowDays: 30,
  reminderLeadDaysByType: {
    年审: 60,
    保险: 60,
    保养: 30,
    维修: 14,
    检修: 30,
  },
  roleMode: "admin",
  ledgerVehicleTypes: [...DEFAULT_LEDGER_VEHICLE_TYPES],
  ledgerUsageNatures: [...DEFAULT_LEDGER_USAGE_NATURES],
};

export function parseAppSettings(raw: string | null): AppSettings {
  if (!raw?.trim())
    return {
      ...DEFAULT_APP_SETTINGS,
      maintenanceKinds: [...DEFAULT_MAINTENANCE_KINDS],
      maintenanceProjects: [...DEFAULT_MAINTENANCE_PROJECTS],
      maintenanceProjectChildren: defaultChildrenForProjects(DEFAULT_MAINTENANCE_PROJECTS),
      roleMode: "admin",
      ledgerVehicleTypes: [...DEFAULT_LEDGER_VEHICLE_TYPES],
      ledgerUsageNatures: [...DEFAULT_LEDGER_USAGE_NATURES],
    };
  try {
    const data = JSON.parse(raw) as Partial<AppSettings> & {
      maintenanceProjectChildren?: unknown;
    };
    const kinds = Array.isArray(data.maintenanceKinds)
      ? data.maintenanceKinds.filter((k) => typeof k === "string")
      : [...DEFAULT_MAINTENANCE_KINDS];
    const projects = Array.isArray(data.maintenanceProjects)
      ? data.maintenanceProjects
          .filter((p) => typeof p === "string")
          .map((p) => p.trim())
          .filter(Boolean)
      : [...DEFAULT_MAINTENANCE_PROJECTS];
    const finalProjects = projects.length ? projects : [...DEFAULT_MAINTENANCE_PROJECTS];

    let children: Record<string, string[]>;
    if (data.maintenanceProjectChildren === undefined) {
      children = defaultChildrenForProjects(finalProjects);
    } else {
      children = filterChildrenToParents(normalizeProjectChildren(data.maintenanceProjectChildren), finalProjects);
    }

    const reminderTaskTypes = Array.isArray(data.reminderTaskTypes)
      ? data.reminderTaskTypes.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean)
      : [...DEFAULT_APP_SETTINGS.reminderTaskTypes];
    const reminderWindowDays =
      typeof data.reminderWindowDays === "number" &&
      Number.isFinite(data.reminderWindowDays) &&
      data.reminderWindowDays > 0
        ? Math.min(365, Math.max(7, Math.round(data.reminderWindowDays)))
        : DEFAULT_APP_SETTINGS.reminderWindowDays;
    const reminderLeadDaysByType =
      data.reminderLeadDaysByType && typeof data.reminderLeadDaysByType === "object"
        ? Object.fromEntries(
            Object.entries(data.reminderLeadDaysByType as Record<string, unknown>)
              .map(([k, v]) => [k.trim(), Number(v)] as const)
              .filter(([k, v]) => !!k && Number.isFinite(v) && v >= 1 && v <= 365)
              .map(([k, v]) => [k, Math.round(v)] as const),
          )
        : { ...DEFAULT_APP_SETTINGS.reminderLeadDaysByType };
    const roleMode =
      data.roleMode === "employee" || data.roleMode === "viewer" || data.roleMode === "admin"
        ? data.roleMode
        : "admin";
    const ledgerVehicleTypes = Array.isArray(data.ledgerVehicleTypes)
      ? data.ledgerVehicleTypes.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean)
      : [];
    const ledgerUsageNatures = Array.isArray(data.ledgerUsageNatures)
      ? data.ledgerUsageNatures.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean)
      : [];
    return {
      maintenanceKinds: kinds.length ? kinds : [...DEFAULT_MAINTENANCE_KINDS],
      maintenanceProjects: finalProjects,
      maintenanceProjectChildren: children,
      reminderTaskTypes: reminderTaskTypes.length ? reminderTaskTypes : [...DEFAULT_APP_SETTINGS.reminderTaskTypes],
      reminderWindowDays,
      reminderLeadDaysByType: Object.keys(reminderLeadDaysByType).length
        ? reminderLeadDaysByType
        : { ...DEFAULT_APP_SETTINGS.reminderLeadDaysByType },
      roleMode,
      ledgerVehicleTypes: ledgerVehicleTypes.length ? ledgerVehicleTypes : [...DEFAULT_LEDGER_VEHICLE_TYPES],
      ledgerUsageNatures: ledgerUsageNatures.length ? ledgerUsageNatures : [...DEFAULT_LEDGER_USAGE_NATURES],
    };
  } catch {
    return {
      ...DEFAULT_APP_SETTINGS,
      maintenanceKinds: [...DEFAULT_MAINTENANCE_KINDS],
      maintenanceProjects: [...DEFAULT_MAINTENANCE_PROJECTS],
      maintenanceProjectChildren: defaultChildrenForProjects(DEFAULT_MAINTENANCE_PROJECTS),
      roleMode: "admin",
      ledgerVehicleTypes: [...DEFAULT_LEDGER_VEHICLE_TYPES],
      ledgerUsageNatures: [...DEFAULT_LEDGER_USAGE_NATURES],
    };
  }
}

export function serializeAppSettings(s: AppSettings): string {
  return JSON.stringify({
    maintenanceKinds: s.maintenanceKinds,
    maintenanceProjects: s.maintenanceProjects,
    maintenanceProjectChildren: s.maintenanceProjectChildren,
    reminderTaskTypes: s.reminderTaskTypes,
    reminderWindowDays: s.reminderWindowDays,
    reminderLeadDaysByType: s.reminderLeadDaysByType,
    roleMode: s.roleMode,
    ledgerVehicleTypes: s.ledgerVehicleTypes,
    ledgerUsageNatures: s.ledgerUsageNatures,
  });
}
