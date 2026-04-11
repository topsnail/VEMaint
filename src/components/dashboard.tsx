"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { Car, Cog, Plus } from "lucide-react";
import { importAssetsFromCsv } from "@/app/actions/assets";
import { escalateReminder, markReminderDone, postponeReminderDays } from "@/app/actions/reminders";
import Link from "next/link";
import { AssetCard } from "@/components/asset-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { nearestReminderForAsset, urgencyPercent } from "@/lib/reminder-utils";

export type AssetRow = {
  id: string;
  name: string;
  type: string;
  identifier: string;
  purchaseDate: string | null;
  insuranceExpiry: string | null;
  inspectionExpiry: string | null;
  operatingPermitExpiry: string | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceMileage: string | null;
  currentMileage: string | null;
  currentHours: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
};

export type ReminderRow = {
  id: string;
  assetId: string;
  taskType: string;
  dueDate: string;
  isNotified: boolean;
  severity?: string | null;
  isEscalated?: boolean;
};

export type MaintenanceRow = {
  id: string;
  assetId: string;
  type: string;
  date: string;
  value: string | null;
  project: string | null;
  projectChild: string | null;
  cost: string | null;
  operator: string | null;
  assignee: string | null;
  vendor: string | null;
  description: string | null;
  nextPlanDate: string | null;
  nextPlanValue: string | null;
  partsJson: { name: string; cost?: string; qty?: string; code?: string }[] | null;
  r2Key: string | null;
};

export type DashboardView = "full" | "alerts" | "devices";
type StatsRange = "30d" | "90d" | "all";
type DashboardStatus = "作业中" | "维修中" | "闲置";
type AlertLevel = "red" | "yellow" | "blue" | "normal";

function alertLevel(dueDate: string, nowIso: string): AlertLevel {
  if (dueDate < nowIso) return "red";
  const now = new Date(`${nowIso}T00:00:00`).getTime();
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  if (Number.isNaN(now) || Number.isNaN(due)) return "normal";
  const days = Math.ceil((due - now) / 86400000);
  if (days <= 30) return "yellow";
  if (days <= 60) return "blue";
  return "normal";
}

function alertClass(level: AlertLevel) {
  if (level === "red") return "border-rose-300 bg-rose-50/70 text-rose-700";
  if (level === "yellow") return "border-amber-300 bg-amber-50/70 text-amber-700";
  if (level === "blue") return "border-blue-300 bg-blue-50/70 text-blue-700";
  return "border-slate-200 bg-white/70 text-slate-600";
}

function alertLabel(level: AlertLevel) {
  if (level === "red") return "逾期";
  if (level === "yellow") return "30天内";
  if (level === "blue") return "60天内";
  return "正常";
}

type DashboardProps = {
  assets: AssetRow[];
  reminders: ReminderRow[];
  records: MaintenanceRow[];
  incidents: { id: string; assetId: string; kind: string; eventDate: string; status: string | null }[];
  faults: { id: string; assetId: string; faultCode: string; eventDate: string; resolvedDate: string | null; isRework: boolean }[];
  maintenanceKinds: string[];
  reminderWindowDays: number;
  reminderLeadDaysByType: Record<string, number>;
  /** 独立路由：完整仪表盘 / 仅预警 / 仅设备 */
  view?: DashboardView;
};

function leadDaysForTask(taskType: string, map: Record<string, number>) {
  const val = map[taskType];
  return Number.isFinite(val) ? Math.max(1, Math.min(365, Math.round(val))) : 30;
}

export function Dashboard({
  assets,
  reminders,
  records,
  incidents,
  faults,
  maintenanceKinds,
  reminderWindowDays,
  reminderLeadDaysByType,
  view = "full",
}: DashboardProps) {
  const router = useRouter();
  const [quickPending, setQuickPending] = useState(false);
  const [q, setQ] = useState("");
  const qDeferred = useDeferredValue(q);
  const [typeFilter, setTypeFilter] = useState<"all" | "车辆" | "机械">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [assetPage, setAssetPage] = useState(1);
  const assetPageSize = 24;
  const [statsRange, setStatsRange] = useState<StatsRange>("90d");
  const todayIso = new Date().toISOString().slice(0, 10);
  const monthIso = new Date().toISOString().slice(0, 7);

  const remindersByAsset = useMemo(() => {
    const m = new Map<string, ReminderRow[]>();
    for (const r of reminders) {
      const list = m.get(r.assetId) ?? [];
      list.push(r);
      m.set(r.assetId, list);
    }
    for (const [, list] of m) {
      list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    return m;
  }, [reminders]);

  const recordsByAsset = useMemo(() => {
    const m = new Map<string, MaintenanceRow[]>();
    for (const rec of records) {
      const list = m.get(rec.assetId) ?? [];
      list.push(rec);
      m.set(rec.assetId, list);
    }
    for (const [, list] of m) {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return m;
  }, [records]);

  const alertList = useMemo(() => {
    const sorted = [...reminders].sort((a, b) => {
      const al = alertLevel(a.dueDate, todayIso);
      const bl = alertLevel(b.dueDate, todayIso);
      const rank = { red: 0, yellow: 1, blue: 2, normal: 3 } as const;
      if (rank[al] !== rank[bl]) return rank[al] - rank[bl];
      return a.dueDate.localeCompare(b.dueDate);
    });
    return view === "alerts" ? sorted : sorted.slice(0, 5);
  }, [reminders, todayIso, view]);

  const filteredAssets = useMemo(() => {
    const query = qDeferred.trim().toLowerCase();
    return assets.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!query) return true;
      const hay = `${a.name} ${a.identifier}`.toLowerCase();
      return hay.includes(query);
    });
  }, [assets, qDeferred, typeFilter, statusFilter]);
  const assetPageCount = Math.max(1, Math.ceil(filteredAssets.length / assetPageSize));
  const pagedAssets = useMemo(() => {
    const p = Math.min(assetPage, assetPageCount);
    const start = (p - 1) * assetPageSize;
    return filteredAssets.slice(start, start + assetPageSize);
  }, [filteredAssets, assetPage, assetPageCount]);
  useEffect(() => {
    setAssetPage(1);
  }, [qDeferred, typeFilter, statusFilter]);

  const metrics = useMemo(() => {
    const statusMap: Record<DashboardStatus, number> = { 作业中: 0, 维修中: 0, 闲置: 0 };
    for (const a of assets) {
      const st = (a.status ?? "").toLowerCase();
      if (st.includes("maintenance") || st.includes("repair") || st.includes("维修")) statusMap["维修中"] += 1;
      else if (st.includes("inactive") || st.includes("idle") || st.includes("闲置")) statusMap["闲置"] += 1;
      else statusMap["作业中"] += 1;
    }
    const monthSpend = records
      .filter((r) => r.date.startsWith(monthIso))
      .reduce((sum, r) => {
        const n = Number((r.cost ?? "").replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? sum + n : sum;
      }, 0);
    const overdue = reminders.filter((r) => !r.isNotified && r.dueDate < todayIso).length;
    const warning30 = reminders.filter((r) => !r.isNotified && alertLevel(r.dueDate, todayIso) === "yellow").length;
    const warning60 = reminders.filter((r) => !r.isNotified && alertLevel(r.dueDate, todayIso) === "blue").length;
    const maintenanceCount = statusMap["维修中"];
    return { statusMap, monthSpend, overdue, warning30, warning60, maintenanceCount };
  }, [assets, records, reminders, monthIso, todayIso]);
  const forecast30 = useMemo(() => {
    const endTs = Date.now() + 30 * 86400000;
    return reminders
      .filter((r) => /(保险|年审|保养)/.test(r.taskType))
      .filter((r) => {
        const ts = new Date(`${r.dueDate}T00:00:00`).getTime();
        return !Number.isNaN(ts) && (r.dueDate < todayIso || ts <= endTs);
      })
      .sort((a, b) => {
        const ao = a.dueDate < todayIso ? 0 : 1;
        const bo = b.dueDate < todayIso ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [reminders, todayIso]);
  const recentActivities = useMemo(() => records.slice(0, 5), [records]);
  const monthPie = useMemo(() => {
    const by: Record<string, number> = { 保险: 0, 配件更换: 0, 维修工时: 0, 其他: 0 };
    for (const r of records.filter((x) => x.date.startsWith(monthIso))) {
      const n = Number((r.cost ?? "").replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(n) || n <= 0) continue;
      const text = `${r.type} ${r.description ?? ""}`;
      if (/保险|续保/.test(text)) by["保险"] += n;
      else if (/换件|配件|轮胎|机油/.test(text)) by["配件更换"] += n;
      else if (/工时|维修|检修/.test(text)) by["维修工时"] += n;
      else by["其他"] += n;
    }
    const total = Object.values(by).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(by).map(([name, value]) => ({ name, value, pct: Math.round((value / total) * 100) }));
  }, [records, monthIso]);
  const monthTrend = useMemo(() => {
    const out: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const count = records.filter((r) => r.date.startsWith(key)).length;
      out.push({ month: key, count });
    }
    return out;
  }, [records]);
  const riskReport = useMemo(() => {
    const rows = assets.map((a) => {
      const list = remindersByAsset.get(a.id) ?? [];
      const due30 = list.filter((r) => {
        const level = alertLevel(r.dueDate, todayIso);
        return !r.isNotified && (level === "red" || level === "yellow");
      }).length;
      const due60 = list.filter((r) => {
        const level = alertLevel(r.dueDate, todayIso);
        return !r.isNotified && (level === "red" || level === "yellow" || level === "blue");
      }).length;
      const due90 = list.filter((r) => {
        if (r.isNotified) return false;
        const now = new Date(`${todayIso}T00:00:00`).getTime();
        const due = new Date(`${r.dueDate}T00:00:00`).getTime();
        if (Number.isNaN(now) || Number.isNaN(due)) return false;
        return due <= now + 90 * 86400000;
      }).length;
      return { id: a.id, name: a.name, identifier: a.identifier, due30, due60, due90 };
    });
    return rows
      .filter((r) => r.due30 > 0 || r.due60 > 0 || r.due90 > 0)
      .sort((a, b) => b.due30 - a.due30 || b.due60 - a.due60 || b.due90 - a.due90)
      .slice(0, 8);
  }, [assets, remindersByAsset, todayIso]);
  const qualityMetrics = useMemo(() => {
    const total = records.length || 1;
    const onTime = records.filter((r) => {
      if (!r.nextPlanDate) return true;
      return r.date <= r.nextPlanDate;
    }).length;
    const rework = faults.filter((f) => f.isRework).length;
    const completedFaults = faults.filter((f) => !!f.resolvedDate).length;
    const mtbfDays =
      faults.length < 2
        ? null
        : Math.round(
            (new Date(`${faults[0].eventDate}T00:00:00`).getTime() -
              new Date(`${faults[faults.length - 1].eventDate}T00:00:00`).getTime()) /
              86400000 /
              (faults.length - 1),
          );
    return {
      onTimeRate: ((onTime / total) * 100).toFixed(1),
      reworkRate: total > 0 ? ((rework / total) * 100).toFixed(1) : "0.0",
      resolvedFaults: completedFaults,
      mtbfDays,
      incidentCount: incidents.length,
    };
  }, [records, faults, incidents.length]);
  const statsRecords = useMemo(() => {
    if (statsRange === "all") return records;
    const days = statsRange === "30d" ? 30 : 90;
    const min = Date.now() - days * 86400000;
    return records.filter((r) => {
      const t = new Date(r.date).getTime();
      return !Number.isNaN(t) && t >= min;
    });
  }, [records, statsRange]);
  const projectStats = useMemo(() => {
    const map = new Map<string, { count: number; totalCost: number }>();
    for (const r of statsRecords) {
      const key = r.project?.trim() || "未分类";
      const item = map.get(key) ?? { count: 0, totalCost: 0 };
      item.count += 1;
      const n = Number((r.cost ?? "").replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(n) && Number.isFinite(n)) item.totalCost += n;
      map.set(key, item);
    }
    return [...map.entries()]
      .map(([project, v]) => ({ project, ...v }))
      .sort((a, b) => b.count - a.count || b.totalCost - a.totalCost);
  }, [statsRecords]);
  const projectChildStats = useMemo(() => {
    const map = new Map<string, { count: number; totalCost: number }>();
    for (const r of statsRecords) {
      const parent = r.project?.trim() || "未分类";
      const child = r.projectChild?.trim() || "未细分";
      const key = `${parent} / ${child}`;
      const item = map.get(key) ?? { count: 0, totalCost: 0 };
      item.count += 1;
      const n = Number((r.cost ?? "").replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(n) && Number.isFinite(n)) item.totalCost += n;
      map.set(key, item);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count || b.totalCost - a.totalCost)
      .slice(0, 6);
  }, [statsRecords]);
  const statsRangeLabel = statsRange === "30d" ? "近30天" : statsRange === "90d" ? "近90天" : "全部";

  function exportStatsCsv() {
    const lines: string[] = [];
    lines.push(`统计范围,${statsRangeLabel}`);
    lines.push("");
    lines.push("项目,次数,总费用");
    for (const s of projectStats) {
      lines.push(`${s.project},${s.count},${s.totalCost.toFixed(2)}`);
    }
    lines.push("");
    lines.push("项目/子类,次数,总费用");
    for (const s of projectChildStats) {
      lines.push(`${s.name},${s.count},${s.totalCost.toFixed(2)}`);
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maintenance-stats-${statsRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAssetsExcel() {
    const lines = ["name,type,identifier,purchaseDate,status,currentMileage,currentHours"];
    for (const a of assets) {
      lines.push(
        [
          a.name,
          a.type,
          a.identifier,
          a.purchaseDate ?? "",
          a.status ?? "",
          a.currentMileage ?? "",
          a.currentHours ?? "",
        ].join(","),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assets-export.xls";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importAssetsCsvPrompt() {
    const sample = "name,type,identifier,purchaseDate,status\n轻型货车A,车辆,粤A12345,2024-01-01,active";
    const raw = window.prompt("粘贴 CSV 内容（含表头）", sample);
    if (!raw?.trim()) return;
    const res = await importAssetsFromCsv(raw);
    if (res.ok) window.alert(`导入成功：${res.created} 条`);
    else window.alert(res.error);
  }

  async function importAssetsExcelFile(file: File) {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab);
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    const header = ["name", "type", "identifier", "purchaseDate", "status"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          String(r.name ?? "").trim(),
          String(r.type ?? "").trim(),
          String(r.identifier ?? "").trim(),
          String(r.purchaseDate ?? "").trim(),
          String(r.status ?? "").trim(),
        ].join(","),
      );
    }
    const res = await importAssetsFromCsv(lines.join("\n"));
    if (res.ok) window.alert(`Excel导入成功：${res.created} 条`);
    else window.alert(res.error);
  }

  return (
    <div className="space-y-8">
      <div>
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {view === "alerts" ? "维保预警" : view === "devices" ? "设备" : "仪表盘"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {view === "alerts"
                ? "最近到期的维保任务（首页摘要最多 5 条）"
                : view === "devices"
                  ? "搜索、筛选与管理台账设备"
                  : "最近到期的维保预警与设备总览"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="h-8 border border-slate-200 bg-white/80 px-3 text-xs text-slate-800 shadow-sm hover:bg-slate-50">
              <Link href="/devices/new">
                <Plus className="h-4 w-4" aria-hidden />
                新增设备
              </Link>
            </Button>
            <Button asChild className="h-8 border border-slate-200 bg-white/80 px-3 text-xs text-slate-800 shadow-sm hover:bg-slate-50">
              <Link href="/reminders/new">
                <Plus className="h-4 w-4" aria-hidden />
                新增预警
              </Link>
            </Button>
            <Button type="button" className="h-8 border border-slate-200 bg-white/80 px-3 text-xs text-slate-800 shadow-sm hover:bg-slate-50" onClick={exportAssetsExcel}>
              导出Excel
            </Button>
            <Button type="button" className="h-8 border border-slate-200 bg-white/80 px-3 text-xs text-slate-800 shadow-sm hover:bg-slate-50" onClick={importAssetsCsvPrompt}>
              导入CSV
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-200 bg-white/80 px-3 text-xs text-slate-800 shadow-sm hover:bg-slate-50">
              导入Excel
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (!f) return;
                  void importAssetsExcelFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </header>

        {view === "full" ? (
          <section className="mb-10 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
                <p className="text-xs text-slate-500">总资产概览</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{assets.length}</p>
                <p className="mt-1 text-xs text-slate-600">车辆 {assets.filter((a) => a.type === "车辆").length} · 机械 {assets.filter((a) => a.type === "机械").length}</p>
              </div>
              <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
                <p className="text-xs text-slate-500">状态分布</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="h-16 w-16 rounded-full"
                    style={{
                      background: `conic-gradient(#10b981 0 ${assets.length ? Math.round((metrics.statusMap["作业中"] / assets.length) * 100) : 0}%, #f59e0b 0 ${assets.length ? Math.round(((metrics.statusMap["作业中"] + metrics.statusMap["维修中"]) / assets.length) * 100) : 0}%, #64748b 0 100%)`,
                    }}
                  />
                  <p className="text-xs text-slate-700">
                    作业中 {metrics.statusMap["作业中"]} · 维修中 {metrics.statusMap["维修中"]} · 闲置 {metrics.statusMap["闲置"]}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
                <p className="text-xs text-slate-500">本月支出监控</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.monthSpend.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
                <p className="text-xs text-slate-500">异常指标（逾期）</p>
                <p className="mt-1 text-2xl font-semibold text-rose-600">{metrics.overdue}</p>
                <p className="mt-1 text-xs text-slate-600">30天内 {metrics.warning30} · 60天内 {metrics.warning60}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl xl:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">智能维保时间轴（未来30天）</p>
                  <div className="flex gap-2">
                    <Button asChild className="h-8 border border-slate-200 bg-white/90 text-xs text-slate-700">
                      <Link href="/reminders/new">上传新保单</Link>
                    </Button>
                    <Button
                      type="button"
                      className="h-8 border border-slate-200 bg-white/90 text-xs text-slate-700"
                      onClick={() => {
                        if (!assets[0]) return;
                        router.push(`/devices/${assets[0].id}?entry=maintenance`);
                      }}
                    >
                      新增维修记录
                    </Button>
                    <Button
                      type="button"
                      className="h-8 border border-slate-200 bg-white/90 text-xs text-slate-700"
                      onClick={() => {
                        if (!assets[0]) return;
                        router.push(`/devices/${assets[0].id}?entry=maintenance`);
                      }}
                    >
                      更新里程/工时
                    </Button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {forecast30.slice(0, 8).map((r) => {
                    const overdue = r.dueDate < todayIso;
                    const level = alertLevel(r.dueDate, todayIso);
                    const a = assets.find((x) => x.id === r.assetId);
                    return (
                      <li key={r.id} className={"rounded-lg border px-3 py-2 text-sm " + (overdue ? "animate-pulse " : "") + alertClass(level)}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-medium text-slate-900">{a?.name ?? "未知设备"}</span>
                            <span className="ml-2 text-slate-600">{r.taskType} · {r.dueDate}</span>
                            <span className="ml-2 rounded-full border px-1.5 py-0.5 text-[10px]">{alertLabel(level)}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              disabled={quickPending}
                              className="h-7 border border-emerald-200 bg-emerald-600 px-2 text-[11px] text-white"
                              onClick={async () => {
                                setQuickPending(true);
                                try {
                                  await markReminderDone(r.id);
                                } finally {
                                  setQuickPending(false);
                                }
                              }}
                            >
                              完成
                            </Button>
                            <Button
                              type="button"
                              disabled={quickPending}
                              className="h-7 border border-slate-200 bg-white/90 px-2 text-[11px] text-slate-700"
                              onClick={async () => {
                                setQuickPending(true);
                                try {
                                  await postponeReminderDays(r.id, 7);
                                } finally {
                                  setQuickPending(false);
                                }
                              }}
                            >
                              延期7天
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
                <p className="mb-3 text-sm font-medium text-slate-800">最近动态</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  {recentActivities.map((r) => (
                    <li key={r.id} className="rounded-md bg-white/70 px-2 py-1">
                      {r.date} · {r.type}
                      {r.project ? ` · ${r.project}${r.projectChild ? `/${r.projectChild}` : ""}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
                <p className="mb-3 text-sm font-medium text-slate-800">费用构成图（本月）</p>
                <div className="flex items-center gap-4">
                  <div className="h-28 w-28 rounded-full" style={{ background: `conic-gradient(#0f172a 0 ${monthPie[0]?.pct ?? 0}%, #2563eb 0 ${(monthPie[0]?.pct ?? 0) + (monthPie[1]?.pct ?? 0)}%, #10b981 0 ${(monthPie[0]?.pct ?? 0) + (monthPie[1]?.pct ?? 0) + (monthPie[2]?.pct ?? 0)}%, #f59e0b 0 100%)` }} />
                  <ul className="space-y-1 text-xs text-slate-600">
                    {monthPie.map((p) => (
                      <li key={p.name}>{p.name}：{p.pct}%</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
                <p className="mb-3 text-sm font-medium text-slate-800">维保趋势图（近6个月）</p>
                <div className="flex h-28 items-end gap-2">
                  {monthTrend.map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-slate-800/80" style={{ height: `${Math.max(8, m.count * 12)}px` }} />
                      <span className="text-[10px] text-slate-500">{m.month.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
              <p className="mb-3 text-sm font-medium text-slate-800">逾期风险报表（30/60/90天）</p>
              {riskReport.length === 0 ? (
                <p className="text-xs text-slate-500">暂无高风险资产</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="px-2 py-2">资产</th>
                        <th className="px-2 py-2">标识</th>
                        <th className="px-2 py-2">30天</th>
                        <th className="px-2 py-2">60天</th>
                        <th className="px-2 py-2">90天</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskReport.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-2 py-2 text-slate-800">{r.name}</td>
                          <td className="px-2 py-2 text-slate-600">{r.identifier}</td>
                          <td className="px-2 py-2 text-rose-700">{r.due30}</td>
                          <td className="px-2 py-2 text-amber-700">{r.due60}</td>
                          <td className="px-2 py-2 text-blue-700">{r.due90}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-xl">
              <p className="mb-2 text-sm font-medium text-slate-800">维保质量评价 / MTBF</p>
              <p className="text-xs text-slate-600">
                按时完成率 {qualityMetrics.onTimeRate}% · 返修率 {qualityMetrics.reworkRate}% · 已关闭故障 {qualityMetrics.resolvedFaults}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                MTBF {qualityMetrics.mtbfDays ?? "—"} 天 · 违章/事故 {qualityMetrics.incidentCount} 条
              </p>
            </div>
          </section>
        ) : null}

        {(view === "full" || view === "alerts") && (
          <section id="alerts" className="mb-12 scroll-mt-24 space-y-4">
            {alertList.length === 0 ? (
              <p className="text-sm text-slate-500">暂无预警，点击「新增预警」或稍后在数据库中维护。</p>
            ) : (
              alertList.map((r) => {
                const asset = assets.find((a) => a.id === r.assetId);
                const pct = urgencyPercent(r.dueDate, reminderWindowDays);
                const level = alertLevel(r.dueDate, todayIso);
                const lead = leadDaysForTask(r.taskType, reminderLeadDaysByType);
                return (
                  <div
                    key={r.id}
                    className={"rounded-xl border p-4 shadow-sm backdrop-blur-md " + alertClass(level)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-slate-900">{asset?.name ?? "未知设备"}</span>
                      <span className="text-slate-500">
                        {r.taskType} · {r.dueDate}
                      </span>
                    </div>
                    <div className="mt-1 text-xs">
                      <span className="rounded-full border px-1.5 py-0.5">{alertLabel(level)}</span>
                      <span className="ml-2 rounded-full border px-1.5 py-0.5">提前 {lead} 天</span>
                      {r.isEscalated ? <span className="ml-2 rounded-full border border-rose-300 px-1.5 py-0.5 text-rose-700">已升级</span> : null}
                    </div>
                    <div className="mt-3">
                      <Progress value={pct} />
                    </div>
                    {!r.isNotified && !r.isEscalated ? (
                      <div className="mt-3">
                        <Button
                          type="button"
                          className="h-7 border border-rose-200 bg-white/90 px-2 text-xs text-rose-700"
                          onClick={async () => {
                            await escalateReminder(r.id);
                          }}
                        >
                          升级通知
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </section>
        )}

        {(view === "full" || view === "devices") && (
        <section id="devices" className="scroll-mt-24">
          {view === "full" ? <h2 className="mb-6 text-lg font-medium text-slate-900">设备</h2> : null}
          {records.length > 0 ? (
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">维保项目汇总（{statsRangeLabel}）</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      className={"h-7 px-2 text-xs " + (statsRange === "30d" ? "bg-slate-900 text-white" : "bg-white/90 text-slate-700")}
                      onClick={() => setStatsRange("30d")}
                    >
                      30天
                    </Button>
                    <Button
                      type="button"
                      className={"h-7 px-2 text-xs " + (statsRange === "90d" ? "bg-slate-900 text-white" : "bg-white/90 text-slate-700")}
                      onClick={() => setStatsRange("90d")}
                    >
                      90天
                    </Button>
                    <Button
                      type="button"
                      className={"h-7 px-2 text-xs " + (statsRange === "all" ? "bg-slate-900 text-white" : "bg-white/90 text-slate-700")}
                      onClick={() => setStatsRange("all")}
                    >
                      全部
                    </Button>
                    <Button type="button" className="h-7 border border-slate-200 bg-white/90 px-2 text-xs text-slate-700" onClick={exportStatsCsv}>
                      导出CSV
                    </Button>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {projectStats.slice(0, 6).map((s) => (
                    <li key={s.project} className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.project}</span>
                      <span className="shrink-0 text-slate-700">
                        {s.count} 次 · {s.totalCost.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
                <p className="mb-2 text-sm font-medium text-slate-800">子类汇总（Top 6）</p>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {projectChildStats.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.name}</span>
                      <span className="shrink-0 text-slate-700">
                        {s.count} 次 · {s.totalCost.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          {assets.length === 0 ? (
            <p className="text-sm text-slate-500">
              暂无设备。执行本地迁移后已包含示例数据；若为空请检查 D1 是否已 apply migrations。
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜索：名称 / 车牌 / 机号"
                  className="min-w-0 flex-1 lg:max-w-md xl:max-w-lg"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className={
                      "h-9 border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (typeFilter === "all" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setTypeFilter("all")}
                  >
                    全部
                  </Button>
                  <Button
                    type="button"
                    className={
                      "h-9 border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (typeFilter === "车辆" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setTypeFilter("车辆")}
                  >
                    车辆
                  </Button>
                  <Button
                    type="button"
                    className={
                      "h-9 border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (typeFilter === "机械" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setTypeFilter("机械")}
                  >
                    机械
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className={
                      "h-9 border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (statusFilter === "all" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setStatusFilter("all")}
                  >
                    全部状态
                  </Button>
                  <Button
                    type="button"
                    className={
                      "h-9 border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (statusFilter === "active" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setStatusFilter("active")}
                  >
                    启用
                  </Button>
                  <Button
                    type="button"
                    className={
                      "h-9 border border-slate-200 bg-white/80 px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (statusFilter === "inactive" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setStatusFilter("inactive")}
                  >
                    停用
                  </Button>
                </div>
              </div>

              {filteredAssets.length === 0 ? (
                <p className="text-sm text-slate-500">没有匹配的设备。</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {pagedAssets.map((a) => {
                const nextR = nearestReminderForAsset(a.id, remindersByAsset);
                const last = (recordsByAsset.get(a.id) ?? [])[0] ?? null;
                return (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    nextReminder={nextR}
                    lastMaintenance={
                      last
                        ? { type: last.type, date: last.date, project: last.project, projectChild: last.projectChild }
                        : null
                    }
                    icon={a.type === "车辆" ? <Car className="h-5 w-5" /> : <Cog className="h-5 w-5" />}
                    reminderWindowDays={reminderWindowDays}
                  />
                );
                  })}
                </div>
              )}
              {filteredAssets.length > 0 ? (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button type="button" className="h-8 border border-slate-200 bg-white/90 px-3 text-xs text-slate-700" disabled={assetPage <= 1} onClick={() => setAssetPage((p) => Math.max(1, p - 1))}>上一页</Button>
                  <span className="text-xs text-slate-500">{assetPage}/{assetPageCount}</span>
                  <Button type="button" className="h-8 border border-slate-200 bg-white/90 px-3 text-xs text-slate-700" disabled={assetPage >= assetPageCount} onClick={() => setAssetPage((p) => Math.min(assetPageCount, p + 1))}>下一页</Button>
                </div>
              ) : null}
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
