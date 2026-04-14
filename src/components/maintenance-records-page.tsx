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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { glassPanelClass, zebraTableRowClass } from "@/lib/table-ui";
import {
  compactActionButtonClass,
  compactMobileActionButtonClass,
  compactPaginationButtonClass,
  compactSheetFooterButtonClass,
  filterPanelGridClass,
  pageContainerClass,
} from "@/lib/ui-style";
import { PageHeader } from "@/components/page-header";
import { downloadExcelFromJson } from "@/lib/excel-export";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type MaintenanceRecordsPageProps = {
  assets: AssetRow[];
  records: MaintenanceRow[];
  maintenanceKinds: string[];
};

function emptyForm() {
  return {
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
  };
}

export function MaintenanceRecordsPage({ assets, records, maintenanceKinds }: MaintenanceRecordsPageProps) {
  const router = useRouter();
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
  const [editingRow, setEditingRow] = useState<MaintenanceRow | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [page, setPage] = useState(1);
  const pageSize = 25;

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

  const sortedFiltered = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [filtered],
  );

  const pageCount = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const pageRows = useMemo(() => {
    const p = Math.min(page, pageCount);
    const start = (p - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [q, typeFilter, projectFilter, vendorFilter, fromDate, toDate, minCost, maxCost]);

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

  function openEdit(r: MaintenanceRow) {
    setMsg(null);
    setEditingRow(r);
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
      partsJson: r.partsJson ? JSON.stringify(r.partsJson, null, 2) : "",
      description: r.description ?? "",
    });
  }

  function exportExcel() {
    const rows = filtered.map((r) => {
      const a = assetById.get(r.assetId);
      return {
        设备: a?.name ?? "",
        "车牌/机号": a?.identifier ?? "",
        类型: r.type,
        项目: r.project ?? "",
        子类: r.projectChild ?? "",
        日期: r.date,
        "里程/小时": r.value ?? "",
        费用: r.cost ?? "",
        经办人: r.operator ?? "",
        执行人: r.assignee ?? "",
        维保单位: r.vendor ?? "",
        下次计划日期: r.nextPlanDate ?? "",
        下次计划值: r.nextPlanValue ?? "",
        说明: (r.description ?? "").replaceAll("\n", " "),
      };
    });
    downloadExcelFromJson({ filename: "maintenance-records.xlsx", sheets: [{ name: "维保记录", rows }] });
  }

  return (
    <div className={pageContainerClass}>
      <PageHeader
        title="维保记录"
        subtitle="跨车辆与设备统一查看、筛选、编辑和导出。"
        actions={
          <>
          <Button
            type="button"
            className={"h-8 border px-3 text-xs " + (view === "list" ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card text-slate-700")}
            onClick={() => setView("list")}
          >
            明细
          </Button>
          <Button
            type="button"
            className={"h-8 border px-3 text-xs " + (view === "monthly" ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card text-slate-700")}
            onClick={() => setView("monthly")}
          >
            按月份汇总
          </Button>
          <Button type="button" variant="outline" className={compactActionButtonClass} onClick={exportExcel}>
            导出 Excel
          </Button>
          </>
        }
      />

      <div className={`${filterPanelGridClass} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${glassPanelClass}`}>
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
      <div className={`${filterPanelGridClass} sm:grid-cols-2 lg:grid-cols-4 ${glassPanelClass}`}>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <Input value={minCost} onChange={(e) => setMinCost(e.target.value)} placeholder="最小费用" />
        <Input value={maxCost} onChange={(e) => setMaxCost(e.target.value)} placeholder="最大费用" />
      </div>

      {view === "monthly" ? (
        <div className={`p-4 ${glassPanelClass}`}>
          <p className="mb-3 text-sm font-medium text-slate-800">按月份汇总（基于当前筛选）</p>
          <div className="max-h-[min(60vh,420px)] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 border-b border-border bg-muted [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
                <TableRow>
                  <TableHead>月份</TableHead>
                  <TableHead>次数</TableHead>
                  <TableHead>总费用</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyStats.map((m, i) => (
                  <TableRow key={m.month} className={zebraTableRowClass(i)}>
                    <TableCell className="font-medium text-slate-800">{m.month}</TableCell>
                    <TableCell className="text-slate-700">{m.count}</TableCell>
                    <TableCell className="text-slate-700">{m.totalCost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {monthlyStats.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-slate-500">
                      暂无汇总数据
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <>
          {/* 桌面：表格 + 表头固定 + 斑马纹 */}
          <div className={`hidden max-h-[min(72vh,620px)] overflow-auto md:block ${glassPanelClass}`}>
            <Table>
              <TableHeader className="sticky top-0 z-20 border-b border-border bg-muted [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
                <TableRow>
                  <TableHead className="min-w-[6rem]">设备</TableHead>
                  <TableHead className="min-w-[5rem]">机号</TableHead>
                  <TableHead className="min-w-[5rem]">类型</TableHead>
                  <TableHead className="min-w-[6rem]">日期</TableHead>
                  <TableHead className="min-w-[8rem]">项目</TableHead>
                  <TableHead className="min-w-[4rem]">费用</TableHead>
                  <TableHead className="min-w-[6rem]">维保单位</TableHead>
                  <TableHead className="w-[7.5rem] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r, i) => {
                  const a = assetById.get(r.assetId);
                  const proj = r.project ? `${r.project}${r.projectChild ? ` / ${r.projectChild}` : ""}` : "—";
                  return (
                    <TableRow key={r.id} className={zebraTableRowClass(i)}>
                      <TableCell className="max-w-[10rem] truncate font-medium text-slate-900" title={a?.name ?? ""}>
                        {a?.name ?? "未知设备"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-700">{a?.identifier ?? "—"}</TableCell>
                      <TableCell className="text-slate-700">{r.type}</TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">{r.date}</TableCell>
                      <TableCell className="max-w-[12rem] truncate text-slate-600" title={proj}>
                        {proj}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-700">{r.cost ?? "—"}</TableCell>
                      <TableCell className="max-w-[8rem] truncate text-slate-600" title={r.vendor ?? undefined}>
                        {r.vendor ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button type="button" variant="outline" size="sm" className="h-8 border-slate-200 px-2 text-xs" onClick={() => openEdit(r)}>
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-rose-200 px-2 text-xs text-rose-700"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                if (!window.confirm("确认删除该条维保记录？")) return;
                                const res = await deleteMaintenanceRecord(r.id, r.assetId);
                                if (!res.ok) setMsg(res.error);
                                else router.refresh();
                              })
                            }
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pageRows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500">
                      暂无记录
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* 手机：摘要卡片 */}
          <div className="space-y-3 md:hidden">
            {pageRows.map((r) => {
              const a = assetById.get(r.assetId);
              return (
                <div key={r.id} className={`space-y-3 p-4 ${glassPanelClass}`}>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{a?.name ?? "未知设备"}</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {r.type} · {r.date}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(a?.identifier ?? "—") + (r.project ? ` · ${r.project}${r.projectChild ? `/${r.projectChild}` : ""}` : "")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">费用 {r.cost ?? "—"} · {r.vendor ?? "无单位"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className={compactMobileActionButtonClass} onClick={() => openEdit(r)}>
                      编辑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`${compactMobileActionButtonClass} border-rose-200 text-rose-700`}
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          if (!window.confirm("确认删除该条维保记录？")) return;
                          const res = await deleteMaintenanceRecord(r.id, r.assetId);
                          if (!res.ok) setMsg(res.error);
                          else router.refresh();
                        })
                      }
                    >
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
            {sortedFiltered.length === 0 ? <p className="text-sm text-slate-500">暂无记录</p> : null}
          </div>

          {sortedFiltered.length > 0 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={compactPaginationButtonClass}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-xs text-slate-500">
                {page}/{pageCount}（共 {sortedFiltered.length} 条）
              </span>
              <Button
                type="button"
                variant="outline"
                className={compactPaginationButtonClass}
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                下一页
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Sheet
        open={!!editingRow}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRow(null);
            setMsg(null);
            setForm(emptyForm());
          }
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl lg:max-w-2xl">
          <SheetHeader className="shrink-0 space-y-1 border-b border-slate-200 px-6 py-4 text-left">
            <SheetTitle>编辑维保记录</SheetTitle>
            <SheetDescription>在下方修改字段，保存后将更新数据库并刷新列表。</SheetDescription>
          </SheetHeader>
          {editingRow ? (
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingRow) return;
                setMsg(null);
                startTransition(async () => {
                  const res = await updateMaintenanceRecord({
                    id: editingRow.id,
                    assetId: editingRow.assetId,
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
                  if (res.ok) {
                    setEditingRow(null);
                    setForm(emptyForm());
                    router.refresh();
                  } else setMsg(res.error);
                });
              }}
            >
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>维保类型</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {maintenanceKinds.map((k) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>项目</Label>
                    <Input value={form.project} onChange={(e) => setForm((p) => ({ ...p, project: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>子类</Label>
                    <Input value={form.projectChild} onChange={(e) => setForm((p) => ({ ...p, projectChild: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>日期</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>里程 / 小时</Label>
                    <Input value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>费用</Label>
                    <Input value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>经办人</Label>
                    <Input value={form.operator} onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>执行人</Label>
                    <Input value={form.assignee} onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>维保单位</Label>
                    <Input value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>下次计划日期</Label>
                    <Input type="date" value={form.nextPlanDate} onChange={(e) => setForm((p) => ({ ...p, nextPlanDate: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>下次计划值</Label>
                    <Input value={form.nextPlanValue} onChange={(e) => setForm((p) => ({ ...p, nextPlanValue: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>零件明细（结构化文本，可选）</Label>
                    <Textarea
                      className="min-h-[88px] font-mono text-xs"
                      value={form.partsJson}
                      onChange={(e) => setForm((p) => ({ ...p, partsJson: e.target.value }))}
                      placeholder='例如 [{"name":"机油滤","qty":"1"}]'
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>说明</Label>
                    <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white px-6 py-4">
                <Button type="submit" disabled={pending} className={compactSheetFooterButtonClass + " min-w-[5rem]"}>
                  保存
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  variant="outline"
                  className={compactSheetFooterButtonClass}
                  onClick={() => {
                    setEditingRow(null);
                    setForm(emptyForm());
                    setMsg(null);
                  }}
                >
                  取消
                </Button>
              </div>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>

      {msg ? <p className="text-xs text-amber-800">{msg}</p> : null}
    </div>
  );
}
