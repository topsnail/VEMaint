"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Cog } from "lucide-react";
import { escalateReminder, markReminderDone, postponeReminderDays } from "@/app/actions/reminders";
import Link from "next/link";
import { AssetCard } from "@/components/asset-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dueRelativeLabel, relativeDueToneClass } from "@/lib/due-date-ui";
import { nearestReminderForAsset, urgencyPercent } from "@/lib/reminder-utils";
import { glassPanelClass, zebraTableRowClass } from "@/lib/table-ui";
import { PageHeader } from "@/components/page-header";
import { downloadExcelFromJson } from "@/lib/excel-export";
import { AssetImportSheet } from "@/components/asset-import-sheet";

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
  if (level === "red") return "border-rose-300 bg-rose-50 text-rose-700";
  if (level === "yellow") return "border-amber-300 bg-amber-50 text-amber-700";
  if (level === "blue") return "border-blue-300 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-white text-slate-600";
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

  function exportStatsExcel() {
    const byProjectRows = projectStats.map((s) => ({ 统计范围: statsRangeLabel, 项目: s.project, 次数: s.count, 总费用: s.totalCost.toFixed(2) }));
    const byProjectChildRows = projectChildStats.map((s) => ({
      统计范围: statsRangeLabel,
      "项目/子类": s.name,
      次数: s.count,
      总费用: s.totalCost.toFixed(2),
    }));
    downloadExcelFromJson({
      filename: `maintenance-stats-${statsRange}.xlsx`,
      sheets: [
        { name: "项目汇总", rows: byProjectRows },
        { name: "子类汇总", rows: byProjectChildRows },
      ],
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <header className="mb-10">
          <PageHeader
            title={view === "alerts" ? "维保预警" : view === "devices" ? "设备" : "仪表盘"}
            subtitle={
              view === "alerts"
                ? "最近到期的维保任务（首页摘要最多 5 条）"
                : view === "devices"
                  ? "搜索、筛选与管理台账设备"
                  : "最近到期的维保预警与设备总览"
            }
            actions={
              view === "devices" ? (
                <>
                  <Button asChild className="h-8 border border-border bg-card text-xs text-slate-700">
                    <Link href="/devices/new">新增设备</Link>
                  </Button>
                  <AssetImportSheet />
                </>
              ) : null
            }
          />
        </header>

        {view === "full" ? (
          <section className="mb-10 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs text-slate-500">总资产概览</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{assets.length}</p>
                <p className="mt-1 text-xs text-slate-600">车辆 {assets.filter((a) => a.type === "车辆").length} · 机械 {assets.filter((a) => a.type === "机械").length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
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
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs text-slate-500">本月支出监控</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.monthSpend.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs text-slate-500">异常指标（逾期）</p>
                <p className="mt-1 text-2xl font-semibold text-rose-600">{metrics.overdue}</p>
                <p className="mt-1 text-xs text-slate-600">30天内 {metrics.warning30} · 60天内 {metrics.warning60}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">智能维保时间轴（未来30天）</p>
                  <div className="flex gap-2">
                    <Button asChild className="h-8 border border-border bg-card text-xs text-slate-700">
                      <Link href="/reminders/new">上传新保单</Link>
                    </Button>
                    <Button
                      type="button"
                      className="h-8 border border-border bg-card text-xs text-slate-700"
                      onClick={() => {
                        if (!assets[0]) return;
                        router.push(`/devices/${assets[0].id}?entry=maintenance`);
                      }}
                    >
                      新增维修记录
                    </Button>
                    <Button
                      type="button"
                      className="h-8 border border-border bg-card text-xs text-slate-700"
                      onClick={() => {
                        if (!assets[0]) return;
                        router.push(`/devices/${assets[0].id}?entry=maintenance`);
                      }}
                    >
                      更新里程/工时
                    </Button>
                  </div>
                </div>
                <div className="hidden max-h-[min(52vh,440px)] overflow-auto md:block">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 border-b border-border bg-muted [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
                      <TableRow>
                        <TableHead className="text-xs">设备</TableHead>
                        <TableHead className="text-xs">任务</TableHead>
                        <TableHead className="text-xs">到期</TableHead>
                        <TableHead className="text-xs">剩余</TableHead>
                        <TableHead className="text-xs">紧急度</TableHead>
                        <TableHead className="w-[7rem] text-right text-xs">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecast30.slice(0, 8).map((r, i) => {
                        const level = alertLevel(r.dueDate, todayIso);
                        const a = assets.find((x) => x.id === r.assetId);
                        const rel = dueRelativeLabel(r.dueDate, todayIso);
                        const relTone = relativeDueToneClass(level);
                        return (
                          <TableRow key={r.id} className={zebraTableRowClass(i)}>
                            <TableCell className="max-w-[8rem] truncate text-xs font-medium text-slate-900" title={a?.name ?? ""}>
                              {a?.name ?? "未知设备"}
                            </TableCell>
                            <TableCell className="max-w-[7rem] truncate text-xs text-slate-700" title={r.taskType}>
                              {r.taskType}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-slate-700">{r.dueDate}</TableCell>
                            <TableCell className={"whitespace-nowrap text-xs " + relTone}>{rel}</TableCell>
                            <TableCell className="text-xs">
                              <span className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px]">{alertLabel(level)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap justify-end gap-1">
                                <Button
                                  type="button"
                                  disabled={quickPending}
                                  className="h-7 border border-primary/25 bg-primary px-2 text-[11px] text-primary-foreground hover:bg-primary/90"
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
                                  className="h-7 border border-border bg-card px-2 text-[11px] text-slate-700"
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
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ul className="space-y-2 md:hidden">
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
                            <span className="mt-1 block text-[11px] text-slate-500">{dueRelativeLabel(r.dueDate, todayIso)}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              disabled={quickPending}
                              className="h-7 border border-primary/25 bg-primary px-2 text-[11px] text-primary-foreground hover:bg-primary/90"
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
                              className="h-7 border border-border bg-card px-2 text-[11px] text-slate-700"
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
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-3 text-sm font-medium text-slate-800">最近动态</p>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="h-8 text-xs text-slate-600">日期</TableHead>
                        <TableHead className="h-8 text-xs text-slate-600">类型</TableHead>
                        <TableHead className="h-8 text-xs text-slate-600">项目</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivities.map((r, i) => (
                        <TableRow key={r.id} className={zebraTableRowClass(i)}>
                          <TableCell className="whitespace-nowrap px-2 py-2 text-xs text-slate-700">{r.date}</TableCell>
                          <TableCell className="px-2 py-2 text-xs text-slate-800">{r.type}</TableCell>
                          <TableCell className="max-w-[12rem] truncate px-2 py-2 text-xs text-slate-600" title={r.project ?? ""}>
                            {r.project ? `${r.project}${r.projectChild ? `/${r.projectChild}` : ""}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 md:hidden">
                  {recentActivities.map((r) => (
                    <li key={r.id} className="rounded-md bg-slate-50 px-2 py-1">
                      {r.date} · {r.type}
                      {r.project ? ` · ${r.project}${r.projectChild ? `/${r.projectChild}` : ""}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
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
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-3 text-sm font-medium text-slate-800">维保趋势图（近6个月）</p>
                <div className="flex h-28 items-end gap-2">
                  {monthTrend.map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(8, m.count * 12)}px` }} />
                      <span className="text-[10px] text-slate-500">{m.month.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 text-sm font-medium text-slate-800">逾期风险报表（30/60/90天）</p>
              {riskReport.length === 0 ? (
                <p className="text-xs text-slate-500">暂无高风险资产</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="h-8 px-2 text-xs text-slate-600">资产</TableHead>
                        <TableHead className="h-8 px-2 text-xs text-slate-600">标识</TableHead>
                        <TableHead className="h-8 px-2 text-xs text-slate-600">30天</TableHead>
                        <TableHead className="h-8 px-2 text-xs text-slate-600">60天</TableHead>
                        <TableHead className="h-8 px-2 text-xs text-slate-600">90天</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riskReport.map((r, i) => (
                        <TableRow key={r.id} className={zebraTableRowClass(i)}>
                          <TableCell className="px-2 py-2 text-xs text-slate-800">{r.name}</TableCell>
                          <TableCell className="px-2 py-2 text-xs text-slate-600">{r.identifier}</TableCell>
                          <TableCell className="px-2 py-2 text-xs text-rose-700">{r.due30}</TableCell>
                          <TableCell className="px-2 py-2 text-xs text-amber-700">{r.due60}</TableCell>
                          <TableCell className="px-2 py-2 text-xs text-blue-700">{r.due90}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-slate-800">维保质量评价 / 平均故障间隔</p>
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
              <>
                <div className="hidden max-h-[min(60vh,480px)] overflow-auto rounded-2xl border border-border bg-card p-3 shadow-sm md:block">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 border-b border-border bg-muted [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
                      <TableRow>
                        <TableHead className="text-xs text-slate-600">设备</TableHead>
                        <TableHead className="text-xs text-slate-600">任务</TableHead>
                        <TableHead className="text-xs text-slate-600">到期</TableHead>
                        <TableHead className="text-xs text-slate-600">剩余</TableHead>
                        <TableHead className="text-xs text-slate-600">紧急度</TableHead>
                        <TableHead className="text-xs text-slate-600">提醒策略</TableHead>
                        <TableHead className="w-24 text-xs text-slate-600">进度</TableHead>
                        <TableHead className="w-[6.5rem] text-right text-xs text-slate-600">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertList.map((r, i) => {
                        const asset = assets.find((a) => a.id === r.assetId);
                        const pct = urgencyPercent(r.dueDate, reminderWindowDays);
                        const level = alertLevel(r.dueDate, todayIso);
                        const lead = leadDaysForTask(r.taskType, reminderLeadDaysByType);
                        const rel = dueRelativeLabel(r.dueDate, todayIso);
                        const relTone = relativeDueToneClass(level);
                        return (
                          <TableRow key={r.id} className={zebraTableRowClass(i)}>
                            <TableCell className="max-w-[9rem] truncate text-xs font-medium text-slate-900" title={asset?.name ?? ""}>
                              {asset?.name ?? "未知设备"}
                            </TableCell>
                            <TableCell className="max-w-[8rem] truncate text-xs text-slate-800" title={r.taskType}>
                              {r.taskType}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-slate-700">{r.dueDate}</TableCell>
                            <TableCell className={"whitespace-nowrap text-xs " + relTone}>{rel}</TableCell>
                            <TableCell className="text-xs">
                              <span className="rounded-full border border-slate-200 px-1.5 py-0.5">{alertLabel(level)}</span>
                            </TableCell>
                            <TableCell className="max-w-[10rem] text-xs text-slate-600">
                              提前 {lead} 天
                              {r.isEscalated ? <span className="ml-1 text-rose-600">·已升级</span> : null}
                            </TableCell>
                            <TableCell>
                              <Progress value={pct} className="h-1.5 w-full max-w-[4.5rem]" />
                            </TableCell>
                            <TableCell className="text-right">
                              {!r.isNotified && !r.isEscalated ? (
                                <Button
                                  type="button"
                                  className="h-7 border border-rose-200 bg-white px-2 text-[11px] text-rose-700"
                                  onClick={async () => {
                                    await escalateReminder(r.id);
                                  }}
                                >
                                  升级通知
                                </Button>
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-4 md:hidden">
                  {alertList.map((r) => {
                    const asset = assets.find((a) => a.id === r.assetId);
                    const pct = urgencyPercent(r.dueDate, reminderWindowDays);
                    const level = alertLevel(r.dueDate, todayIso);
                    const lead = leadDaysForTask(r.taskType, reminderLeadDaysByType);
                    return (
                      <div
                        key={r.id}
                        className={"rounded-xl border p-4 shadow-sm " + alertClass(level)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-slate-900">{asset?.name ?? "未知设备"}</span>
                          <span className="text-slate-500">
                            {r.taskType} · {r.dueDate}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{dueRelativeLabel(r.dueDate, todayIso)}</p>
                        <div className="mt-1 text-xs">
                          <span className="rounded-full border px-1.5 py-0.5">{alertLabel(level)}</span>
                          <span className="ml-2 rounded-full border px-1.5 py-0.5">提前 {lead} 天</span>
                          {r.isEscalated ? (
                            <span className="ml-2 rounded-full border border-rose-300 px-1.5 py-0.5 text-rose-700">已升级</span>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          <Progress value={pct} />
                        </div>
                        {!r.isNotified && !r.isEscalated ? (
                          <div className="mt-3">
                            <Button
                              type="button"
                              className="h-7 border border-rose-200 bg-white px-2 text-xs text-rose-700"
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
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {(view === "full" || view === "devices") && (
        <section id="devices" className="scroll-mt-24">
          {view === "full" ? <h2 className="mb-6 text-lg font-medium text-slate-900">设备</h2> : null}
          {records.length > 0 ? (
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">维保项目汇总（{statsRangeLabel}）</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      className={"h-7 px-2 text-xs " + (statsRange === "30d" ? "bg-primary text-primary-foreground" : "bg-card text-slate-700")}
                      onClick={() => setStatsRange("30d")}
                    >
                      30天
                    </Button>
                    <Button
                      type="button"
                      className={"h-7 px-2 text-xs " + (statsRange === "90d" ? "bg-primary text-primary-foreground" : "bg-card text-slate-700")}
                      onClick={() => setStatsRange("90d")}
                    >
                      90天
                    </Button>
                    <Button
                      type="button"
                      className={"h-7 px-2 text-xs " + (statsRange === "all" ? "bg-primary text-primary-foreground" : "bg-card text-slate-700")}
                      onClick={() => setStatsRange("all")}
                    >
                      全部
                    </Button>
                    <Button type="button" className="h-7 border border-border bg-card px-2 text-xs text-slate-700" onClick={exportStatsExcel}>
                      导出Excel
                    </Button>
                  </div>
                </div>
                <div className="max-h-52 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="h-8 px-2 text-xs text-slate-600">维保项目</TableHead>
                        <TableHead className="h-8 px-2 text-right text-xs text-slate-600">次数 / 费用</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectStats.slice(0, 6).map((s, i) => (
                        <TableRow key={s.project} className={zebraTableRowClass(i)}>
                          <TableCell className="max-w-[10rem] truncate px-2 py-2 text-xs font-medium text-slate-800">{s.project}</TableCell>
                          <TableCell className="whitespace-nowrap px-2 py-2 text-right text-xs text-slate-700">
                            {s.count} 次 · {s.totalCost.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-2 text-sm font-medium text-slate-800">子类汇总（前 6 项）</p>
                <div className="max-h-52 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="h-8 px-2 text-xs text-slate-600">子类</TableHead>
                        <TableHead className="h-8 px-2 text-right text-xs text-slate-600">次数 / 费用</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectChildStats.map((s, i) => (
                        <TableRow key={s.name} className={zebraTableRowClass(i)}>
                          <TableCell className="max-w-[10rem] truncate px-2 py-2 text-xs font-medium text-slate-800">{s.name}</TableCell>
                          <TableCell className="whitespace-nowrap px-2 py-2 text-right text-xs text-slate-700">
                            {s.count} 次 · {s.totalCost.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                      "h-8 border border-border bg-card px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (typeFilter === "all" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setTypeFilter("all")}
                  >
                    全部
                  </Button>
                  <Button
                    type="button"
                    className={
                      "h-8 border border-border bg-card px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (typeFilter === "车辆" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setTypeFilter("车辆")}
                  >
                    车辆
                  </Button>
                  <Button
                    type="button"
                    className={
                      "h-8 border border-border bg-card px-3 text-sm text-slate-700 hover:bg-slate-50 " +
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
                      "h-8 border border-border bg-card px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (statusFilter === "all" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setStatusFilter("all")}
                  >
                    全部状态
                  </Button>
                  <Button
                    type="button"
                    className={
                      "h-8 border border-border bg-card px-3 text-sm text-slate-700 hover:bg-slate-50 " +
                      (statusFilter === "active" ? "ring-1 ring-slate-300/60" : "")
                    }
                    onClick={() => setStatusFilter("active")}
                  >
                    启用
                  </Button>
                  <Button
                    type="button"
                    className={
                      "h-8 border border-border bg-card px-3 text-sm text-slate-700 hover:bg-slate-50 " +
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
                <>
                  <div className={`hidden max-h-[min(72vh,560px)] overflow-auto md:block ${glassPanelClass}`}>
                    <Table>
                      <TableHeader className="sticky top-0 z-20 border-b border-border bg-muted [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
                        <TableRow>
                          <TableHead className="min-w-[6rem]">名称</TableHead>
                          <TableHead className="min-w-[3.5rem]">类型</TableHead>
                          <TableHead className="min-w-[5rem]">标识</TableHead>
                          <TableHead className="min-w-[3.5rem]">状态</TableHead>
                          <TableHead className="min-w-[9rem]">下次预警</TableHead>
                          <TableHead className="min-w-[9rem]">最近维保</TableHead>
                          <TableHead className="w-[7rem] text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedAssets.map((a, i) => {
                          const nextR = nearestReminderForAsset(a.id, remindersByAsset);
                          const last = (recordsByAsset.get(a.id) ?? [])[0] ?? null;
                          const nextText = nextR ? `${nextR.taskType} · ${nextR.dueDate}` : "—";
                          const lastText = last
                            ? `${last.type} · ${last.date}${last.project ? ` · ${last.project}` : ""}`
                            : "—";
                          return (
                            <TableRow key={a.id} className={zebraTableRowClass(i)}>
                              <TableCell className="max-w-[10rem] truncate font-medium text-slate-900" title={a.name}>
                                {a.name}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-slate-700">{a.type}</TableCell>
                              <TableCell className="whitespace-nowrap text-slate-600">{a.identifier}</TableCell>
                              <TableCell className="text-slate-600">{a.status}</TableCell>
                              <TableCell className="max-w-[12rem] truncate text-xs text-slate-600" title={nextText}>
                                {nextText}
                              </TableCell>
                              <TableCell className="max-w-[14rem] truncate text-xs text-slate-600" title={lastText}>
                                {lastText}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button asChild type="button" variant="outline" size="sm" className="h-8 border-slate-200 px-2 text-xs">
                                  <Link href={`/devices/${a.id}`}>详情</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 md:hidden xl:grid-cols-2">
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
                </>
              )}
              {filteredAssets.length > 0 ? (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button type="button" className="h-8 border border-border bg-card px-3 text-xs text-slate-700" disabled={assetPage <= 1} onClick={() => setAssetPage((p) => Math.max(1, p - 1))}>上一页</Button>
                  <span className="text-xs text-slate-500">{assetPage}/{assetPageCount}</span>
                  <Button type="button" className="h-8 border border-border bg-card px-3 text-xs text-slate-700" disabled={assetPage >= assetPageCount} onClick={() => setAssetPage((p) => Math.min(assetPageCount, p + 1))}>下一页</Button>
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
