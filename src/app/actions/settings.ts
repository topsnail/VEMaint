"use server";

import { getCloudflareEnv } from "@/lib/cf-env";
import { hasCurrentUserPermission } from "@/lib/auth-session";
import { writeAuditLog } from "@/lib/audit";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_LEDGER_USAGE_NATURES,
  DEFAULT_LEDGER_VEHICLE_TYPES,
  DEFAULT_MAINTENANCE_KINDS,
  DEFAULT_MAINTENANCE_PROJECTS,
  KV_APP_SETTINGS_KEY,
  type AppSettings,
  parseAppSettings,
  serializeAppSettings,
} from "@/lib/kv-settings";
import { KV_ASSET_FIELDS_KEY, parseAssetFieldsConfig, type AssetFieldsConfig } from "@/lib/asset-fields";
import { revalidatePath } from "next/cache";

export async function getAppSettingsAction(): Promise<AppSettings> {
  const { KV } = getCloudflareEnv();
  const raw = await KV.get(KV_APP_SETTINGS_KEY, "text");
  return parseAppSettings(raw);
}

export async function getAssetFieldsConfigAction(): Promise<AssetFieldsConfig> {
  const { KV } = getCloudflareEnv();
  const raw = await KV.get(KV_ASSET_FIELDS_KEY, "text");
  return parseAssetFieldsConfig(raw);
}

export type UpdateAppSettingsInput = {
  maintenanceKindsText: string;
  maintenanceProjectsText: string;
  /** 与当前一级维保项目对齐；值可为空数组表示该级下不设子类 */
  maintenanceProjectChildren: Record<string, string[]>;
  reminderTaskTypesText: string;
  reminderWindowDays: number;
  reminderLeadRulesText: string;
  roleMode: "admin" | "employee" | "viewer";
  ledgerVehicleTypesText: string;
  ledgerUsageNaturesText: string;
};

export async function updateAppSettingsAction(input: UpdateAppSettingsInput) {
  if (!(await hasCurrentUserPermission("settings.write"))) {
    return { ok: false as const, error: "仅管理员可修改系统设置" };
  }
  const { KV } = getCloudflareEnv();
  const kinds = input.maintenanceKindsText
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const projects = input.maintenanceProjectsText
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const reminderTaskTypes = input.reminderTaskTypesText
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ledgerVehicleTypes = input.ledgerVehicleTypesText
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ledgerUsageNatures = input.ledgerUsageNaturesText
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const window = Number(input.reminderWindowDays);
  const reminderWindowDays =
    Number.isFinite(window) && window > 0 ? Math.min(365, Math.max(7, Math.round(window))) : DEFAULT_APP_SETTINGS.reminderWindowDays;
  const reminderLeadDaysByType = Object.fromEntries(
    input.reminderLeadRulesText
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [k, v] = line.split(/[:：]/);
        return [k?.trim() ?? "", Number(v)] as const;
      })
      .filter(([k, v]) => !!k && Number.isFinite(v) && v >= 1 && v <= 365)
      .map(([k, v]) => [k, Math.round(v)] as const),
  );

  const projectList = projects.length ? projects : [...DEFAULT_MAINTENANCE_PROJECTS];
  const children: Record<string, string[]> = {};
  for (const p of projectList) {
    const list = input.maintenanceProjectChildren[p];
    children[p] = Array.isArray(list)
      ? list.filter((s) => typeof s === "string").map((s) => s.trim()).filter(Boolean)
      : [];
  }

  const next: AppSettings = {
    maintenanceKinds: kinds.length ? kinds : [...DEFAULT_MAINTENANCE_KINDS],
    maintenanceProjects: projectList,
    maintenanceProjectChildren: children,
    reminderTaskTypes: reminderTaskTypes.length ? reminderTaskTypes : [...DEFAULT_APP_SETTINGS.reminderTaskTypes],
    reminderWindowDays,
    reminderLeadDaysByType: Object.keys(reminderLeadDaysByType).length
      ? reminderLeadDaysByType
      : { ...DEFAULT_APP_SETTINGS.reminderLeadDaysByType },
    roleMode:
      input.roleMode === "employee" || input.roleMode === "viewer" || input.roleMode === "admin"
        ? input.roleMode
        : "admin",
    ledgerVehicleTypes: ledgerVehicleTypes.length ? ledgerVehicleTypes : [...DEFAULT_LEDGER_VEHICLE_TYPES],
    ledgerUsageNatures: ledgerUsageNatures.length ? ledgerUsageNatures : [...DEFAULT_LEDGER_USAGE_NATURES],
  };

  await KV.put(KV_APP_SETTINGS_KEY, serializeAppSettings(next));
  await writeAuditLog({
    action: "settings.update",
    target: KV_APP_SETTINGS_KEY,
    detail: {
      maintenanceKindsCount: next.maintenanceKinds.length,
      maintenanceProjectsCount: next.maintenanceProjects.length,
      reminderWindowDays: next.reminderWindowDays,
      roleModeFallback: next.roleMode,
      ledgerVehicleTypesCount: next.ledgerVehicleTypes.length,
      ledgerUsageNaturesCount: next.ledgerUsageNatures.length,
    },
  });
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/vehicle-ledger");
  return { ok: true as const };
}
