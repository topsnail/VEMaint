"use client";

import { deleteVehicleLedger } from "@/app/actions/vehicle-ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VehicleLedgerRow } from "@/lib/vehicle-ledger-dto";
import { USAGE_STATUS } from "@/lib/vehicle-ledger";
import Link from "next/link";
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">车辆台账</h1>
          <Button asChild className="h-9">
            <Link href="/vehicle-ledger/new">新增车辆</Link>
          </Button>
        </div>
        <div className="grid gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-sm backdrop-blur-md md:grid-cols-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索车牌/编号/品牌/驾驶人" />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger><SelectValue placeholder="部门筛选" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {deptOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="状态筛选" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {USAGE_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {pageRows.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-900">{r.internalNo} · {r.plateNo} · {r.brandModel} · {r.usageStatus}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button" className="h-8 border border-slate-200 bg-white px-3 text-xs text-slate-700">
                    <Link href={`/vehicle-ledger/${r.id}`}>查看</Link>
                  </Button>
                  <Button asChild type="button" className="h-8 border border-slate-200 bg-white px-3 text-xs text-slate-700">
                    <Link href={`/vehicle-ledger/${r.id}/edit`}>修改</Link>
                  </Button>
                  <Button
                    type="button"
                    className="h-8 border border-rose-200 bg-white px-3 text-xs text-rose-700"
                    onClick={() =>
                      startTransition(async () => {
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
            </div>
          ))}
          {filteredRows.length === 0 ? <p className="text-sm text-slate-500">暂无匹配车辆数据</p> : null}
        </div>
        {filteredRows.length > 0 ? (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" className="h-8 border border-slate-200 bg-white px-3 text-xs text-slate-700" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</Button>
            <span className="text-xs text-slate-500">{page}/{pageCount}</span>
            <Button type="button" className="h-8 border border-slate-200 bg-white px-3 text-xs text-slate-700" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>下一页</Button>
          </div>
        ) : null}
        {msg ? <p className="text-xs text-rose-700">{msg}</p> : null}
    </div>
  );
}
