"use client";

import { importAssetsFromExcelRows, type ImportAssetRow } from "@/app/actions/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { downloadExcelFromJson } from "@/lib/excel-export";
import * as XLSX from "xlsx";
import { useMemo, useState, useTransition } from "react";

function readTextCell(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeImportRow(r: Record<string, unknown>): ImportAssetRow {
  // 支持模板列头与常见中文列头
  const name = readTextCell(r.name ?? r["名称"]);
  const type = readTextCell(r.type ?? r["类型"]);
  const identifier = readTextCell(r.identifier ?? r["标识"] ?? r["车牌/机号"]);
  const purchaseDate = readTextCell(r.purchaseDate ?? r["购置日期"]);
  const status = readTextCell(r.status ?? r["状态"]);
  return {
    name,
    type,
    identifier,
    purchaseDate: purchaseDate || undefined,
    status: status || undefined,
  };
}

export function AssetImportSheet() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ImportAssetRow[]>([]);
  const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const preview = useMemo(() => rows.slice(0, 8), [rows]);

  function downloadTemplate() {
    downloadExcelFromJson({
      filename: "资产导入模板.xlsx",
      sheets: [
        {
          name: "资产",
          rows: [
            { name: "轻型货车 A1", type: "车辆", identifier: "粤B12345", purchaseDate: "2026-01-01", status: "active" },
            { name: "发电机 G1", type: "机械", identifier: "G-0001", purchaseDate: "2025-12-10", status: "active" },
          ],
        },
      ],
    });
  }

  async function onPickFile(file: File | null) {
    setMsg(null);
    setErrors([]);
    setRows([]);
    setFileName("");
    if (!file) return;
    setFileName(file.name);
    if (!/\.xlsx$/i.test(file.name)) {
      setMsg("仅支持 .xlsx 文件");
      return;
    }
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    const normalized = json.map((r) => normalizeImportRow(r)).filter((r) => Object.values(r).some((v) => String(v ?? "").trim()));
    if (normalized.length === 0) {
      setMsg("Excel 为空或无有效数据行");
      return;
    }
    // 本地预校验（与服务端一致的最小规则）
    const localErrors: { row: number; error: string }[] = [];
    for (let i = 0; i < normalized.length; i += 1) {
      const r = normalized[i];
      if (!r.name?.trim()) localErrors.push({ row: i + 2, error: "名称必填" });
      if (!r.identifier?.trim()) localErrors.push({ row: i + 2, error: "标识必填" });
      if (r.type !== "车辆" && r.type !== "机械") localErrors.push({ row: i + 2, error: "类型仅支持 车辆/机械" });
      if (r.purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(r.purchaseDate)) {
        localErrors.push({ row: i + 2, error: "购置日期格式须为 YYYY-MM-DD" });
      }
    }
    setRows(normalized);
    setErrors(localErrors);
    if (localErrors.length) setMsg(`发现 ${localErrors.length} 个问题，修正后再导入`);
  }

  function doImport() {
    setMsg(null);
    startTransition(async () => {
      const res = await importAssetsFromExcelRows(rows);
      if (!res.ok) {
        setMsg(res.error);
        if ("errors" in res && Array.isArray((res as any).errors)) setErrors((res as any).errors);
        return;
      }
      setErrors(res.errors ?? []);
      setMsg(`已导入 ${res.created} 行` + (res.errors?.length ? `（${res.errors.length} 行被跳过）` : ""));
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="h-8 border-slate-200 bg-white text-slate-700">
          导入电子表格
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="shrink-0 space-y-1 border-b border-slate-200 px-6 py-4 text-left">
          <SheetTitle>导入资产（电子表格）</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="border-slate-200 bg-white" onClick={downloadTemplate}>
              下载模板
            </Button>
            <p className="text-xs text-slate-500">仅支持 `.xlsx`。首个工作表作为导入来源。</p>
          </div>

          <div className="space-y-2">
            <Label>选择电子表格文件</Label>
            <Input type="file" accept=".xlsx" onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)} />
            {fileName ? <p className="text-xs text-slate-500">已选择：{fileName}</p> : null}
          </div>

          {preview.length ? (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-medium text-slate-700">预览（前 {preview.length} 行）</p>
              <div className="space-y-1 text-xs text-slate-600">
                {preview.map((r, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <span className="truncate" title={r.name}>{r.name}</span>
                    <span className="truncate" title={r.identifier}>{r.identifier}</span>
                    <span className="truncate" title={r.type}>{r.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {errors.length ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="mb-2 text-xs font-medium text-rose-800">校验问题（按表格行号）</p>
              <ul className="space-y-1 text-xs text-rose-700">
                {errors.slice(0, 12).map((e, i) => (
                  <li key={i}>
                    第 {e.row} 行：{e.error}
                  </li>
                ))}
                {errors.length > 12 ? <li>… 还有 {errors.length - 12} 条</li> : null}
              </ul>
            </div>
          ) : null}

          {msg ? <p className="text-xs text-primary">{msg}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white px-6 py-4">
          <Button type="button" disabled={pending || rows.length === 0 || errors.length > 0} onClick={doImport}>
            {pending ? "导入中…" : "开始导入"}
          </Button>
          <Button type="button" variant="outline" className="border-slate-200 bg-white" onClick={() => setOpen(false)}>
            关闭
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

