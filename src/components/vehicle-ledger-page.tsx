"use client";

import {
  createVehicleShareLinkAction,
  deleteVehicleLedger,
  queryVehicleLedgersAction,
} from "@/app/actions/vehicle-ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/row-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VehicleLedgerRow } from "@/lib/vehicle-ledger-dto";
import { glassPanelClass, zebraTableRowClass } from "@/lib/table-ui";
import {
  compactActionButtonClass,
  compactPaginationButtonClass,
  filterPanelGridClass,
  pageContainerClass,
} from "@/lib/ui-style";
import { USAGE_STATUS } from "@/lib/vehicle-ledger";
import { promptVehicleLedgerPin } from "@/lib/vehicle-ledger-pin";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

export function VehicleLedgerPage({
  initialRows,
  initialTotal,
  deptOptions,
  canWrite,
  canDelete,
  initialError,
}: {
  initialRows: VehicleLedgerRow[];
  initialTotal: number;
  deptOptions: string[];
  canWrite: boolean;
  canDelete: boolean;
  initialError?: string;
}) {
  const [rows, setRows] = useState<VehicleLedgerRow[]>(initialRows);
  const [total, setTotal] = useState<number>(initialTotal);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(
    initialError ? { kind: "error", text: initialError } : null,
  );
  const [lastShareUrl, setLastShareUrl] = useState<string>("");
  const [q, setQ] = useState("");
  const qDeferred = useDeferredValue(q);
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  async function shareVehicleLink(id: string, plateNo: string) {
    // 先同步打开新标签页（保留用户手势），避免异步后被弹窗拦截
    // 注意：部分浏览器在使用 noopener 时会让返回句柄不可控，导致后续跳转失败
    const opened = window.open("about:blank", "_blank");
    try {
      opened?.document.write(
        `<meta charset="utf-8" /><title>正在打开分享页…</title><div style="font-family: ui-sans-serif, system-ui; padding: 16px;">正在打开分享页…</div>`,
      );
      opened?.document.close();
    } catch {
      // ignore
    }
    const share = await createVehicleShareLinkAction(id);
    if (!share.ok) {
      if (opened) opened.close();
      setMsg({ kind: "error", text: share.error });
      return;
    }
    const url = `${window.location.origin}${share.path}`;
    setLastShareUrl(url);
    const shareText = `车辆信息：${plateNo}`;
    try {
      opened?.location.replace(url);
    } catch {
      // ignore; fallback link below
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: "车辆信息", text: shareText, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setMsg({ kind: "success", text: `已生成 ${plateNo} 的分享链接（已打开分享页）` });
    } catch {
      setMsg({ kind: "error", text: "分享失败，请稍后重试" });
    }
  }

  useEffect(() => {
    setPage(1);
  }, [qDeferred, deptFilter, statusFilter]);

  useEffect(() => {
    startTransition(async () => {
      const res = await queryVehicleLedgersAction({
        q: qDeferred,
        department: deptFilter,
        usageStatus: statusFilter,
        page,
        pageSize,
      });
      if (!res.ok) {
        setMsg({ kind: "error", text: res.error });
        return;
      }
      setRows(res.rows);
      setTotal(res.total);
    });
  }, [qDeferred, deptFilter, statusFilter, page, pageSize]);

  const pageRows = useMemo(() => rows, [rows]);

  return (
    <div className={pageContainerClass}>
      <PageHeader
        title="车辆台账"
        actions={
          canWrite ? (
            <Button asChild className={`${compactActionButtonClass} shrink-0`}>
              <Link href="/vehicle-ledger/new">新增车辆</Link>
            </Button>
          ) : (
            <Button className={`${compactActionButtonClass} shrink-0`} disabled title="只读账号不可新增">
              新增车辆
            </Button>
          )
        }
      />
      <div className={`${filterPanelGridClass} md:grid-cols-3 ${glassPanelClass}`}>
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
                  <RowActions
                    actions={[
                      { kind: "view", href: `/vehicle-ledger/${r.id}` },
                      {
                        kind: "edit",
                        disabled: !canWrite,
                        onClick: () => {
                          if (!canWrite) return;
                          if (!promptVehicleLedgerPin()) return;
                          router.push(`/vehicle-ledger/${r.id}/edit`);
                        },
                      },
                      { kind: "share", onClick: () => void shareVehicleLink(r.id, r.plateNo) },
                      {
                        kind: "delete",
                        disabled: pending || !canDelete,
                        onClick: () =>
                          startTransition(async () => {
                            if (!canDelete) return;
                            if (!promptVehicleLedgerPin()) return;
                            if (!window.confirm(`确认删除车辆「${r.plateNo}」?`)) return;
                            const res = await deleteVehicleLedger(r.id);
                            if (!res.ok) setMsg({ kind: "error", text: res.error });
                            else {
                              setMsg({ kind: "success", text: "已删除" });
                              const refreshed = await queryVehicleLedgersAction({
                                q: qDeferred,
                                department: deptFilter,
                                usageStatus: statusFilter,
                                page,
                                pageSize,
                              });
                              if (refreshed.ok) {
                                setRows(refreshed.rows);
                                setTotal(refreshed.total);
                              }
                            }
                          }),
                      },
                    ]}
                  />
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
            <RowActions
              mobile
              actions={[
                { kind: "view", href: `/vehicle-ledger/${r.id}` },
                {
                  kind: "edit",
                  disabled: !canWrite,
                  onClick: () => {
                    if (!canWrite) return;
                    if (!promptVehicleLedgerPin()) return;
                    router.push(`/vehicle-ledger/${r.id}/edit`);
                  },
                },
                { kind: "share", onClick: () => void shareVehicleLink(r.id, r.plateNo) },
                {
                  kind: "delete",
                  disabled: pending || !canDelete,
                  onClick: () =>
                    startTransition(async () => {
                      if (!canDelete) return;
                      if (!promptVehicleLedgerPin()) return;
                      if (!window.confirm(`确认删除车辆「${r.plateNo}」?`)) return;
                      const res = await deleteVehicleLedger(r.id);
                      if (!res.ok) setMsg({ kind: "error", text: res.error });
                      else {
                        setMsg({ kind: "success", text: "已删除" });
                        const refreshed = await queryVehicleLedgersAction({
                          q: qDeferred,
                          department: deptFilter,
                          usageStatus: statusFilter,
                          page,
                          pageSize,
                        });
                        if (refreshed.ok) {
                          setRows(refreshed.rows);
                          setTotal(refreshed.total);
                        }
                      }
                    }),
                },
              ]}
            />
          </div>
        ))}
        {total === 0 ? <p className="text-sm text-slate-500">暂无匹配车辆数据</p> : null}
      </div>

      {total > 0 ? (
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
            {page}/{pageCount}（共 {total} 条）
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
      {msg ? (
        <div className="space-y-1">
          <p className={msg.kind === "error" ? "text-xs text-rose-700" : "text-xs text-emerald-700"}>{msg.text}</p>
          {lastShareUrl ? (
            <a
              className="block max-w-full truncate text-xs text-sky-700 underline underline-offset-2 hover:text-sky-800"
              href={lastShareUrl}
              target="_blank"
              rel="noreferrer"
            >
              {lastShareUrl}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
