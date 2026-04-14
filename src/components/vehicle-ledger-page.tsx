"use client";

import { deleteVehicleLedger } from "@/app/actions/vehicle-ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VehicleLedgerRow } from "@/lib/vehicle-ledger-dto";
import { glassPanelClass, zebraTableRowClass } from "@/lib/table-ui";
import { USAGE_STATUS } from "@/lib/vehicle-ledger";
import { promptVehicleLedgerPin } from "@/lib/vehicle-ledger-pin";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

export function VehicleLedgerPage({
  initial,
}: {
  initial: VehicleLedgerRow[];
}) {
  const [rows, setRows] = useState<VehicleLedgerRow[]>(initial);
  const [msg, setMsg] = useState<string>("");
  const [q, setQ] = useState("");
  const qDeferred = useDeferredValue(q);
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const deptOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department?.trim()).filter((v): v is string => !!v))).sort(),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const qq = qDeferred.trim().toLowerCase();
    return rows.filter((r) => {
      if (deptFilter !== "all" && (r.department ?? "") !== deptFilter) return false;
      if (statusFilter !== "all" && r.usageStatus !== statusFilter) return false;
      if (!qq) return true;
      const hay = `${r.plateNo} ${r.internalNo} ${r.brandModel} ${r.ownerName ?? ""} ${r.archiveNo ?? ""} ${r.defaultDriver ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, qDeferred, deptFilter, statusFilter]);
  useEffect(() => {
    setPage(1);
  }, [qDeferred, deptFilter, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = useMemo(() => {
    const p = Math.min(page, pageCount);
    const start = (p - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageCount]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <PageHeader
        title="车辆台账"
        actions={
          <Button asChild className="h-8 shrink-0">
            <Link href="/vehicle-ledger/new">新增车辆</Link>
          </Button>
        }
      />
      <div className={`grid gap-2 p-3 md:grid-cols-3 ${glassPanelClass}`}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索车牌/编号/品牌/驾驶人" />
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger>
            <SelectValue placeholder="部门筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部部门</SelectItem>
            {deptOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {USAGE_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 桌面：卡片容器 + 斑马纹表格 */}
      <div className={`hidden max-h-[min(72vh,560px)] overflow-auto md:block ${glassPanelClass}`}>
        <Table>
          <TableHeader className="sticky top-0 z-20 border-b border-border bg-muted [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
            <TableRow>
              <TableHead className="min-w-[7rem]">内部编号</TableHead>
              <TableHead className="min-w-[6rem]">车牌</TableHead>
              <TableHead className="min-w-[10rem]">品牌型号</TableHead>
              <TableHead className="min-w-[6rem]">部门</TableHead>
              <TableHead className="min-w-[5rem]">状态</TableHead>
              <TableHead className="w-[11rem] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r, i) => (
              <TableRow
                key={r.id}
                className={zebraTableRowClass(i)}
              >
                <TableCell className="font-medium text-slate-900">{r.internalNo}</TableCell>
                <TableCell className="text-slate-800">{r.plateNo}</TableCell>
                <TableCell className="max-w-[14rem] truncate text-slate-700" title={r.brandModel}>
                  {r.brandModel}
                </TableCell>
                <TableCell className="max-w-[8rem] truncate text-slate-600" title={r.department || undefined}>
                  {r.department || "—"}
                </TableCell>
                <TableCell className="text-slate-700">{r.usageStatus}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button asChild type="button" size="sm" variant="outline" className="h-8 border-slate-200 bg-white px-2.5 text-xs">
                      <Link href={`/vehicle-ledger/${r.id}`}>查看</Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-slate-200 bg-white px-2.5 text-xs"
                      onClick={() => {
                        if (!promptVehicleLedgerPin()) return;
                        router.push(`/vehicle-ledger/${r.id}/edit`);
                      }}
                    >
                      修改
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-rose-200 bg-white px-2.5 text-xs text-rose-700"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          if (!promptVehicleLedgerPin()) return;
                          if (!window.confirm(`确认删除车辆「${r.plateNo}」?`)) return;
                          const res = await deleteVehicleLedger(r.id);
                          if (!res.ok) setMsg(res.error);
                          else setRows((prev) => prev.filter((x) => x.id !== r.id));
                        })
                      }
                    >
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  暂无匹配车辆数据
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {/* 手机：摘要卡片 + 大触控区 */}
      <div className="space-y-3 md:hidden">
        {pageRows.map((r) => (
          <div key={r.id} className={`space-y-3 p-4 ${glassPanelClass}`}>
            <div>
              <p className="text-base font-semibold text-slate-900">{r.plateNo}</p>
              <p className="mt-1 text-sm text-slate-600">
                {r.internalNo} · {r.brandModel}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {(r.department || "未填部门") + " · " + r.usageStatus}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button asChild type="button" className="h-10 w-full border border-slate-200 bg-white text-xs text-slate-800">
                <Link href={`/vehicle-ledger/${r.id}`}>查看</Link>
              </Button>
              <Button
                type="button"
                className="h-10 w-full border border-slate-200 bg-white text-xs text-slate-800"
                onClick={() => {
                  if (!promptVehicleLedgerPin()) return;
                  router.push(`/vehicle-ledger/${r.id}/edit`);
                }}
              >
                修改
              </Button>
              <Button
                type="button"
                className="h-10 w-full border border-rose-200 bg-white text-xs text-rose-700"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!promptVehicleLedgerPin()) return;
                    if (!window.confirm(`确认删除车辆「${r.plateNo}」?`)) return;
                    const res = await deleteVehicleLedger(r.id);
                    if (!res.ok) setMsg(res.error);
                    else setRows((prev) => prev.filter((x) => x.id !== r.id));
                  })
                }
              >
                删除
              </Button>
            </div>
          </div>
        ))}
        {filteredRows.length === 0 ? <p className="text-sm text-slate-500">暂无匹配车辆数据</p> : null}
      </div>

      {filteredRows.length > 0 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            className="h-9 min-w-[4.5rem] border border-slate-200 bg-white px-3 text-xs text-slate-700"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </Button>
          <span className="text-xs text-slate-500">
            {page}/{pageCount}
          </span>
          <Button
            type="button"
            className="h-9 min-w-[4.5rem] border border-slate-200 bg-white px-3 text-xs text-slate-700"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            下一页
          </Button>
        </div>
      ) : null}
      {msg ? <p className="text-xs text-rose-700">{msg}</p> : null}
    </div>
  );
}
