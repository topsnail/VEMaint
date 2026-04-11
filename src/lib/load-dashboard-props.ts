import type { AssetRow, MaintenanceRow, ReminderRow } from "@/components/dashboard";
import { loadDashboardData } from "@/lib/dashboard-data";
import { loadAppSettings } from "@/lib/app-settings";
import { getCloudflareEnv } from "@/lib/cf-env";
import { cache } from "react";

function safeParseParts(raw: string | null): { name: string; cost?: string; qty?: string; code?: string }[] | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    const v = JSON.parse(t) as unknown;
    if (!Array.isArray(v)) return null;
    return v
      .filter((x) => x && typeof x === "object")
      .map((x) => x as Record<string, unknown>)
      .map((x) => ({
        name: String(x.name ?? "").trim(),
        cost: String(x.cost ?? "").trim() || undefined,
        qty: String(x.qty ?? "").trim() || undefined,
        code: String(x.code ?? "").trim() || undefined,
      }))
      .filter((x) => x.name);
  } catch {
    return null;
  }
}

export type DashboardDataProps = {
  maintenanceKinds: string[];
  reminderWindowDays: number;
  reminderLeadDaysByType: Record<string, number>;
  assets: AssetRow[];
  reminders: ReminderRow[];
  records: MaintenanceRow[];
  incidents: { id: string; assetId: string; kind: string; eventDate: string; status: string | null }[];
  faults: { id: string; assetId: string; faultCode: string; eventDate: string; resolvedDate: string | null; isRework: boolean }[];
};

export const loadDashboardDataProps = cache(async function loadDashboardDataProps(): Promise<DashboardDataProps> {
  const env = getCloudflareEnv();
  const [{ assetRows, reminderRows, recordRows, incidentRows, faultRows }, appSettings] = await Promise.all([
    loadDashboardData(env),
    loadAppSettings(env.KV),
  ]);

  return {
    maintenanceKinds: appSettings.maintenanceKinds,
    reminderWindowDays: appSettings.reminderWindowDays,
    reminderLeadDaysByType: appSettings.reminderLeadDaysByType ?? {},
    assets: assetRows.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      identifier: a.identifier,
      purchaseDate: a.purchaseDate,
      insuranceExpiry: a.insuranceExpiry,
      inspectionExpiry: a.inspectionExpiry,
      operatingPermitExpiry: a.operatingPermitExpiry,
      lastMaintenanceDate: a.lastMaintenanceDate,
      nextMaintenanceMileage: a.nextMaintenanceMileage,
      currentMileage: a.currentMileage,
      currentHours: a.currentHours,
      status: a.status,
      metadata: a.metadata ?? null,
    })),
    reminders: reminderRows.map((r) => ({
      id: r.id,
      assetId: r.assetId,
      taskType: r.taskType,
      dueDate: r.dueDate,
      isNotified: r.isNotified,
      severity: r.severity,
      isEscalated: r.isEscalated,
    })),
    records: recordRows.map((m) => ({
      id: m.id,
      assetId: m.assetId,
      type: m.type,
      date: m.date,
      value: m.value,
      project: m.project,
      projectChild: m.projectChild,
      cost: m.cost,
      operator: m.operator,
      assignee: m.assignee,
      vendor: m.vendor,
      description: m.description,
      nextPlanDate: m.nextPlanDate,
      nextPlanValue: m.nextPlanValue,
      partsJson: safeParseParts(m.partsJson),
      r2Key: m.r2Key,
    })),
    incidents: incidentRows.map((x) => ({
      id: x.id,
      assetId: x.assetId,
      kind: x.kind,
      eventDate: x.eventDate,
      status: x.status,
    })),
    faults: faultRows.map((x) => ({
      id: x.id,
      assetId: x.assetId,
      faultCode: x.faultCode,
      eventDate: x.eventDate,
      resolvedDate: x.resolvedDate,
      isRework: x.isRework,
    })),
  };
});

/** 顶栏全局搜索与预警角标用（单次请求内与 loadDashboardDataProps 共享缓存） */
export async function loadAppShellPayload() {
  const p = await loadDashboardDataProps();
  return {
    searchAssets: p.assets.map((a) => ({ id: a.id, name: a.name, identifier: a.identifier })),
    searchRecords: p.records.map((r) => ({
      id: r.id,
      assetId: r.assetId,
      type: r.type,
      date: r.date,
      description: r.description,
      project: r.project,
      projectChild: r.projectChild,
    })),
    pendingReminderCount: p.reminders.filter((r) => !r.isNotified).length,
  };
}
