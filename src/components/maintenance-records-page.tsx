"use client";

import { deleteMaintenanceRecord, updateMaintenanceRecord } from "@/app/actions/maintenance";
import type { AssetRow, MaintenanceRow } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState, useTransition } from "react";

type MaintenanceRecordsPageProps = {
  assets: AssetRow[];
  records: MaintenanceRow[];
  maintenanceKinds: string[];
};

export function MaintenanceRecordsPage({ assets, records, maintenanceKinds }: MaintenanceRecordsPageProps) {
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"list" | "monthly">("list");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "",
    project: "",
    projectChild: "",
    date: "",
    value: "",
    cost: "",
    operator: "",
    assignee: "",
    vendor: "",
    nextPlanDate: "",
    nextPlanValue: "",
    partsJson: "",
    description: "",
  });

  const assetById = useMemo(() => new Map(assets.map((a) => [a.id, a] as const)), [assets]);
  const projectOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.project).filter((v): v is string => !!v?.trim()))).sort(),
    [records],
  );
  const vendorOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.vendor).filter((v): v is string => !!v?.trim()))).sort(),
    [records],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return records.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (projectFilter !== "all" && (r.project ?? "") !== projectFilter) return false;
      if (vendorFilter !== "all" && (r.vendor ?? "") !== vendorFilter) return false;
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
      const n = Number((r.cost ?? "").replace(/[^\d.-]/g, ""));
      if (minCost && Number.isFinite(n) && n < Number(minCost)) return false;
      if (maxCost && Number.isFinite(n) && n > Number(maxCost)) return false;
      if (!query) return true;
      const asset = assetById.get(r.assetId);
      const hay = `${asset?.name ?? ""} ${asset?.identifier ?? ""} ${r.type} ${r.project ?? ""} ${r.projectChild ?? ""} ${r.vendor ?? ""} ${r.assignee ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [records, q, typeFilter, projectFilter, vendorFilter, fromDate, toDate, minCost, maxCost, assetById]);
  const monthlyStats = useMemo(() => {
    const map = new Map<string, { count: number; totalCost: number }>();
    for (const r of filtered) {
      const month = r.date?.slice(0, 7) || "未知月份";
      const item = map.get(month) ?? { count: 0, totalCost: 0 };
      item.count += 1;
      const n = Number((r.cost ?? "").replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(n) && Number.isFinite(n)) item.totalCost += n;
      map.set(month, item);
    }
    return [...map.entries()]
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  function exportCsv() {
    const lines = ["设备,车牌/机号,类型,项目,子类,日期,里程/小时,费用,经办人,执行人,维保单位,下次计划日期,下次计划值,说明"];
    for (const r of filtered) {
      const a = assetById.get(r.assetId);
      lines.push(
        [
          a?.name ?? "",
          a?.identifier ?? "",
          r.type,
          r.project ?? "",
          r.projectChild ?? "",
          r.date,
          r.value ?? "",
          r.cost ?? "",
          r.operator ?? "",
          r.assignee ?? "",
          r.vendor ?? "",
          r.nextPlanDate ?? "",
          r.nextPlanValue ?? "",
          (r.description ?? "").replaceAll("\n", " "),
        ].join(","),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maintenance-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">维保记录</h1>
            <p className="mt-1 text-sm text-slate-500">跨车辆与设备统一查看、筛选、编辑和导出。</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              className={"h-9 border px-3 text-xs " + (view === "list" ? "bg-slate-900 text-white" : "border-slate-200 bg-white/90 text-slate-700")}
              onClick={() => setView("list")}
            >
              明细
            </Button>
            <Button
              type="button"
              className={"h-9 border px-3 text-xs " + (view === "monthly" ? "bg-slate-900 text-white" : "border-slate-200 bg-white/90 text-slate-700")}
              onClick={() => setView("monthly")}
            >
              按月份汇总
            </Button>
            <Button type="button" className="h-9 border border-slate-200 bg-white/90 text-slate-700" onClick={exportCsv}>
              导出 CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-sm backdrop-blur-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索设备/机号/类型/项目" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="维保类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {maintenanceKinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="维保项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {projectOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="维保单位" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部维保单位</SelectItem>
              {vendorOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-sm backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <Input value={minCost} onChange={(e) => setMinCost(e.target.value)} placeholder="最小费用" />
          <Input value={maxCost} onChange={(e) => setMaxCost(e.target.value)} placeholder="最大费用" />
        </div>

        {view === "monthly" ? (
          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
            <p className="mb-3 text-sm font-medium text-slate-800">按月份汇总（基于当前筛选）</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-2 py-2 font-medium">月份</th>
                    <th className="px-2 py-2 font-medium">次数</th>
                    <th className="px-2 py-2 font-medium">总费用</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map((m) => (
                    <tr key={m.month} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-2 py-2 text-slate-800">{m.month}</td>
                      <td className="px-2 py-2 text-slate-700">{m.count}</td>
                      <td className="px-2 py-2 text-slate-700">{m.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                  {monthlyStats.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-slate-500" colSpan={3}>
                        暂无汇总数据
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
            const a = assetById.get(r.assetId);
            return (
              <div key={r.id} className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {a?.name ?? "未知设备"} · {r.type}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(a?.identifier ?? "—")} · {r.date}
                      {r.project ? ` · ${r.project}${r.projectChild ? `/${r.projectChild}` : ""}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="h-8 border border-slate-200 bg-white/90 px-3 text-xs text-slate-700"
                      onClick={() => {
                        setEditId(r.id);
                        setMsg(null);
                        setForm({
                          type: r.type,
                          project: r.project ?? "",
                          projectChild: r.projectChild ?? "",
                          date: r.date,
                          value: r.value ?? "",
                          cost: r.cost ?? "",
                          operator: r.operator ?? "",
                          assignee: r.assignee ?? "",
                          vendor: r.vendor ?? "",
                          nextPlanDate: r.nextPlanDate ?? "",
                          nextPlanValue: r.nextPlanValue ?? "",
                          partsJson: r.partsJson ? JSON.stringify(r.partsJson) : "",
                          description: r.description ?? "",
                        });
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      type="button"
                      className="h-8 border border-rose-200 bg-white/90 px-3 text-xs text-rose-700"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await deleteMaintenanceRecord(r.id, r.assetId);
                          if (!res.ok) setMsg(res.error);
                        })
                      }
                    >
                      删除
                    </Button>
                  </div>
                </div>

                {editId === r.id ? (
                  <form
                    className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white/70 p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setMsg(null);
                      startTransition(async () => {
                        const res = await updateMaintenanceRecord({
                          id: r.id,
                          assetId: r.assetId,
                          type: form.type,
                          project: form.project || undefined,
                          projectChild: form.projectChild || undefined,
                          date: form.date,
                          value: form.value || undefined,
                          cost: form.cost || undefined,
                          operator: form.operator || undefined,
                          assignee: form.assignee || undefined,
                          vendor: form.vendor || undefined,
                          nextPlanDate: form.nextPlanDate || undefined,
                          nextPlanValue: form.nextPlanValue || undefined,
                          partsJson: form.partsJson || undefined,
                          description: form.description || undefined,
                        });
                        if (res.ok) setEditId(null);
                        else setMsg(res.error);
                      });
                    }}
                  >
                    <div className="grid gap-2 md:grid-cols-4">
                      <div className="grid gap-1">
                        <Label>类型</Label>
                        <Input value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} />
                      </div>
                      <div className="grid gap-1">
                        <Label>项目</Label>
                        <Input value={form.project} onChange={(e) => setForm((p) => ({ ...p, project: e.target.value }))} />
                      </div>
                      <div className="grid gap-1">
                        <Label>子类</Label>
                        <Input value={form.projectChild} onChange={(e) => setForm((p) => ({ ...p, projectChild: e.target.value }))} />
                      </div>
                      <div className="grid gap-1">
                        <Label>日期</Label>
                        <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <Input placeholder="里程/小时" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
                      <Input placeholder="费用" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))} />
                      <Input placeholder="经办人" value={form.operator} onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))} />
                    </div>
                    <Input placeholder="说明" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={pending} className="h-8 px-3 text-xs">
                        保存
                      </Button>
                      <Button
                        type="button"
                        disabled={pending}
                        className="h-8 border border-slate-200 bg-white/90 px-3 text-xs text-slate-700"
                        onClick={() => setEditId(null)}
                      >
                        取消
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            );
            })}
            {filtered.length === 0 ? <p className="text-sm text-slate-500">暂无记录</p> : null}
          </div>
        )}

        {msg ? <p className="text-xs text-amber-800">{msg}</p> : null}
    </div>
  );
}

