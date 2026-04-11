"use client";

import { createMaintenanceRecordFromForm } from "@/app/actions/maintenance";
import { deleteReminder, markReminderDone } from "@/app/actions/reminders";
import { updateAsset } from "@/app/actions/assets";
import { listAssetStatusLogs } from "@/app/actions/assets";
import { createFaultEvent, createIncidentFromForm, listFaultsByAsset, listIncidentsByAsset } from "@/app/actions/ops";
import { getAppSettingsAction, getAssetFieldsConfigAction } from "@/app/actions/settings";
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
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

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
function alertPill(level: AlertLevel) {
  if (level === "red") return "bg-rose-50 text-rose-700";
  if (level === "yellow") return "bg-amber-50 text-amber-700";
  if (level === "blue") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
}
function alertLabel(level: AlertLevel) {
  if (level === "red") return "逾期";
  if (level === "yellow") return "30天内";
  if (level === "blue") return "60天内";
  return "正常";
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium transition " +
        (active
          ? "border-slate-300 bg-slate-900/5 text-slate-900"
          : "border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-50")
      }
    >
      {children}
    </button>
  );
}

export type AssetDetailViewProps = {
  asset: AssetRow;
  entry?: "profile" | "maintenance";
  records: MaintenanceRow[];
  maintenanceKinds: string[];
  reminders: {
    id: string;
    assetId: string;
    taskType: string;
    dueDate: string;
    isNotified: boolean;
  }[];
};

export function AssetDetailView({
  asset,
  entry = "maintenance",
  records,
  maintenanceKinds,
  reminders,
}: AssetDetailViewProps) {
  const [pending, startTransition] = useTransition();
  const [reminderPending, startReminderTransition] = useTransition();
  const [assetPending, startAssetTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [assetMsg, setAssetMsg] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState("保养");
  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [cost, setCost] = useState("");
  const [operator, setOperator] = useState("");
  const [assignee, setAssignee] = useState("");
  const [vendor, setVendor] = useState("");
  const [nextPlanDate, setNextPlanDate] = useState("");
  const [nextPlanValue, setNextPlanValue] = useState("");
  const [partsJson, setPartsJson] = useState("");
  const [description, setDescription] = useState("");

  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<"车辆" | "机械">("车辆");
  const [assetIdentifier, setAssetIdentifier] = useState("");
  const [assetPurchaseDate, setAssetPurchaseDate] = useState("");
  const [assetInsuranceExpiry, setAssetInsuranceExpiry] = useState("");
  const [assetInspectionExpiry, setAssetInspectionExpiry] = useState("");
  const [assetOperatingPermitExpiry, setAssetOperatingPermitExpiry] = useState("");
  const [assetNextMaintenanceMileage, setAssetNextMaintenanceMileage] = useState("");
  const [assetCurrentMileage, setAssetCurrentMileage] = useState("");
  const [assetCurrentHours, setAssetCurrentHours] = useState("");
  const [assetStatus, setAssetStatus] = useState("");
  const [assetMetadataJson, setAssetMetadataJson] = useState("");
  const [assetDyn, setAssetDyn] = useState<Record<string, string>>({});
  const [assetFieldDefs, setAssetFieldDefs] = useState<{ key: string; label: string; type: string; required?: boolean; placeholder?: string }[]>([]);
  const [tab, setTab] = useState<"timeline" | "reminders">("timeline");
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("all");
  const [recordProjectFilter, setRecordProjectFilter] = useState<string>("all");
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [recType, setRecType] = useState("");
  const [recProject, setRecProject] = useState("");
  const [recProjectChild, setRecProjectChild] = useState("");
  const [recDate, setRecDate] = useState("");
  const [recValue, setRecValue] = useState("");
  const [recCost, setRecCost] = useState("");
  const [recOperator, setRecOperator] = useState("");
  const [recAssignee, setRecAssignee] = useState("");
  const [recVendor, setRecVendor] = useState("");
  const [recNextPlanDate, setRecNextPlanDate] = useState("");
  const [recNextPlanValue, setRecNextPlanValue] = useState("");
  const [recPartsJson, setRecPartsJson] = useState("");
  const [recDescription, setRecDescription] = useState("");
  const [recMsg, setRecMsg] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [projectChildren, setProjectChildren] = useState<Record<string, string[]>>({});
  const [project, setProject] = useState("");
  const [projectChild, setProjectChild] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [statusLogs, setStatusLogs] = useState<
    { id: string; fromStatus: string; toStatus: string; note: string | null; createdAt: string }[]
  >([]);
  const [incidents, setIncidents] = useState<{ id: string; kind: string; eventDate: string; detail: string | null }[]>([]);
  const [faults, setFaults] = useState<{ id: string; faultCode: string; eventDate: string; resolvedDate: string | null; isRework: boolean }[]>([]);

  const kindsKey = maintenanceKinds.join("|");

  useEffect(() => {
    if (!asset) return;
    const list = maintenanceKinds.length ? maintenanceKinds : ["保养"];
    const first = list[0] ?? "保养";
    setType((prev) => (list.includes(prev) ? prev : first));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 以 asset?.id 与 kindsKey 为准
  }, [asset?.id, kindsKey, maintenanceKinds]);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getAppSettingsAction();
        if (cancelled) return;
        const nextProjects = s.maintenanceProjects ?? [];
        const nextChildren = s.maintenanceProjectChildren ?? {};
        setProjects(nextProjects);
        setProjectChildren(nextChildren);
        const first = nextProjects[0] ?? "";
        setProject(first);
        setProjectChild((nextChildren[first] ?? [])[0] ?? "");
      } catch {
        if (cancelled) return;
        setProjects([]);
        setProjectChildren({});
        setProject("");
        setProjectChild("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  useEffect(() => {
    const list = projectChildren[project] ?? [];
    setProjectChild((prev) => (prev && list.includes(prev) ? prev : list[0] ?? ""));
  }, [project, projectChildren]);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    (async () => {
      const rows = await listAssetStatusLogs(asset.id);
      if (cancelled) return;
      setStatusLogs(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    (async () => {
      const [incRows, faultRows] = await Promise.all([listIncidentsByAsset(asset.id), listFaultsByAsset(asset.id)]);
      if (cancelled) return;
      setIncidents(
        incRows.map((x) => ({ id: x.id, kind: x.kind, eventDate: x.eventDate, detail: x.detail ?? null })),
      );
      setFaults(
        faultRows.map((x) => ({
          id: x.id,
          faultCode: x.faultCode,
          eventDate: x.eventDate,
          resolvedDate: x.resolvedDate ?? null,
          isRework: x.isRework,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  const kinds = maintenanceKinds.length ? maintenanceKinds : ["保养"];
  const availableProjects = Array.from(
    new Set(
      [
        ...projects,
        ...records.map((r) => r.project).filter((v): v is string => !!v?.trim()),
      ].map((v) => v.trim()).filter(Boolean),
    ),
  );
  const filteredRecords = records.filter((r) => {
    const typePass = recordTypeFilter === "all" || r.type === recordTypeFilter;
    const projectPass = recordProjectFilter === "all" || (r.project ?? "") === recordProjectFilter;
    return typePass && projectPass;
  });
  const metaEntries = Object.entries(asset?.metadata ?? {}).filter(([k, v]) => k && v !== undefined);
  metaEntries.sort(([a], [b]) => a.localeCompare(b, "zh-CN"));

  useEffect(() => {
    if (!asset) return;
    setAssetName(asset.name);
    setAssetType(asset.type === "机械" ? "机械" : "车辆");
    setAssetIdentifier(asset.identifier);
    setAssetPurchaseDate(asset.purchaseDate ?? "");
    setAssetInsuranceExpiry(asset.insuranceExpiry ?? "");
    setAssetInspectionExpiry(asset.inspectionExpiry ?? "");
    setAssetOperatingPermitExpiry(asset.operatingPermitExpiry ?? "");
    setAssetNextMaintenanceMileage(asset.nextMaintenanceMileage ?? "");
    setAssetCurrentMileage(asset.currentMileage ?? "");
    setAssetCurrentHours(asset.currentHours ?? "");
    setAssetStatus(asset.status ?? "");
    setAssetMetadataJson(asset.metadata ? JSON.stringify(asset.metadata, null, 2) : "");
    setAssetDyn({});
    setAssetFieldDefs([]);
    setAssetMsg(null);
    setEditOpen(entry === "profile");
    setTab(entry === "profile" ? "timeline" : "timeline");
    setRecordTypeFilter("all");
    setRecordProjectFilter("all");
    setEditRecordId(null);
    setRecMsg(null);
  }, [asset, entry]);

  useEffect(() => {
    if (!editOpen || !asset) return;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getAssetFieldsConfigAction();
        if (cancelled) return;
        const defs = cfg.byType[assetType] ?? [];
        setAssetFieldDefs(defs);
        const base = (asset.metadata ?? {}) as Record<string, unknown>;
        const next: Record<string, string> = {};
        for (const d of defs) {
          const v = base[d.key];
          if (v === undefined || v === null) continue;
          next[d.key] = typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);
        }
        setAssetDyn(next);
      } catch {
        if (cancelled) return;
        setAssetFieldDefs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editOpen, assetType, asset]);

  if (!asset) return null;

  function resetForm() {
    setType(kinds[0] ?? "保养");
    setDate("");
    setValue("");
    setCost("");
    setOperator("");
    setAssignee("");
    setVendor("");
    setNextPlanDate("");
    setNextPlanValue("");
    setPartsJson("");
    setDescription("");
    setProject("");
    setProjectChild("");
    setMessage(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const current = asset;
    if (!current) return;
    setMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("assetId", current.id);
    fd.set("type", type);
    fd.set("date", date || new Date().toISOString().slice(0, 10));
    fd.set("value", value);
    fd.set("cost", cost);
    fd.set("operator", operator);
    fd.set("assignee", assignee);
    fd.set("vendor", vendor);
    fd.set("nextPlanDate", nextPlanDate);
    fd.set("nextPlanValue", nextPlanValue);
    fd.set("partsJson", partsJson.trim());
    fd.set("project", project);
    fd.set("projectChild", projectChild);
    fd.set("description", description.trim());

    startTransition(async () => {
      const res = await createMaintenanceRecordFromForm(fd);
      if (res.ok) {
        setMessage("已保存");
        if (res.r2Key && res.fileSize) {
          const mb = (res.fileSize / (1024 * 1024)).toFixed(2);
          setUploadHint(`附件已上传：${mb}MB`);
          setTimeout(() => setUploadHint(null), 3500);
        }
        resetForm();
        form.reset();
      } else {
        setMessage(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-semibold text-slate-900">{asset.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {asset.type} · {asset.identifier}
        </p>
      </header>

      <div className="space-y-6">
          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-800">设备信息</h3>
              <Button
                type="button"
                className="h-8 border border-slate-200 bg-white/90 px-3 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setAssetMsg(null);
                  setEditOpen((v) => !v);
                }}
              >
                {editOpen ? "取消编辑" : "编辑"}
              </Button>
            </div>

            {editOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAssetMsg(null);
                  startAssetTransition(async () => {
                    let merged = assetMetadataJson || "";
                    try {
                      const base = assetMetadataJson?.trim() ? (JSON.parse(assetMetadataJson) as unknown) : {};
                      const obj =
                        base && typeof base === "object" && !Array.isArray(base) ? (base as Record<string, unknown>) : {};
                      for (const [k, v] of Object.entries(assetDyn)) {
                        if (v?.trim()) obj[k] = v.trim();
                      }
                      merged = Object.keys(obj).length ? JSON.stringify(obj, null, 2) : "";
                    } catch {
                      // keep raw; server will validate
                    }
                    const res = await updateAsset({
                      id: asset.id,
                      name: assetName,
                      type: assetType,
                      identifier: assetIdentifier,
                      purchaseDate: assetPurchaseDate || undefined,
                      insuranceExpiry: assetInsuranceExpiry || undefined,
                      inspectionExpiry: assetInspectionExpiry || undefined,
                      operatingPermitExpiry: assetOperatingPermitExpiry || undefined,
                      nextMaintenanceMileage: assetNextMaintenanceMileage || undefined,
                      currentMileage: assetCurrentMileage || undefined,
                      currentHours: assetCurrentHours || undefined,
                      status: assetStatus || undefined,
                      metadataJson: merged || undefined,
                    });
                    if (res.ok) {
                      setAssetMsg("已保存");
                      setEditOpen(false);
                    } else {
                      setAssetMsg(res.error);
                    }
                  });
                }}
                className="space-y-3"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>名称</Label>
                    <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>类型</Label>
                    <Select value={assetType} onValueChange={(v: string) => setAssetType(v === "机械" ? "机械" : "车辆")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="车辆">车辆</SelectItem>
                        <SelectItem value="机械">机械</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>车牌 / 机号</Label>
                    <Input value={assetIdentifier} onChange={(e) => setAssetIdentifier(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>购置日期</Label>
                    <Input type="date" value={assetPurchaseDate} onChange={(e) => setAssetPurchaseDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>保险到期</Label>
                    <Input type="date" value={assetInsuranceExpiry} onChange={(e) => setAssetInsuranceExpiry(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>年审到期</Label>
                    <Input type="date" value={assetInspectionExpiry} onChange={(e) => setAssetInspectionExpiry(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>营运证到期</Label>
                    <Input
                      type="date"
                      value={assetOperatingPermitExpiry}
                      onChange={(e) => setAssetOperatingPermitExpiry(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>下次保养里程</Label>
                    <Input value={assetNextMaintenanceMileage} onChange={(e) => setAssetNextMaintenanceMileage(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>当前里程</Label>
                    <Input value={assetCurrentMileage} onChange={(e) => setAssetCurrentMileage(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>当前工时</Label>
                    <Input value={assetCurrentHours} onChange={(e) => setAssetCurrentHours(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>状态（active / inactive）</Label>
                  <Input value={assetStatus} onChange={(e) => setAssetStatus(e.target.value)} placeholder="active" />
                </div>
                <div className="grid gap-2">
                  <Label>metadata（JSON 对象，可选）</Label>
                  <Textarea
                    value={assetMetadataJson}
                    onChange={(e) => setAssetMetadataJson(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                    placeholder='{"载重":"1.5t"}'
                  />
                </div>
                {assetFieldDefs.length ? (
                  <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-sm backdrop-blur-md">
                    <p className="mb-3 text-xs font-medium text-slate-700">动态字段（来自 KV）</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {assetFieldDefs.map((f) => (
                        <div key={f.key} className="grid gap-1">
                          <Label>
                            {f.label}
                            {f.required ? <span className="ml-1 text-rose-600">*</span> : null}
                          </Label>
                          <Input
                            value={assetDyn[f.key] ?? ""}
                            onChange={(e) => setAssetDyn((prev) => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            required={!!f.required}
                            inputMode={f.type === "number" ? "numeric" : undefined}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">会合并写入 metadata（JSON）。</p>
                  </div>
                ) : null}
                {assetMsg ? <p className="text-xs text-amber-800">{assetMsg}</p> : null}
                <div className="flex gap-2">
                  <Button type="submit" disabled={assetPending} className="w-full">
                    {assetPending ? "保存中…" : "保存"}
                  </Button>
                  <Button
                    type="button"
                    disabled={assetPending}
                    className="w-full border border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setAssetStatus("inactive");
                    }}
                  >
                    停用
                  </Button>
                </div>
              </form>
            ) : (
            <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">购置日期</p>
                <p className="mt-1 text-sm text-slate-900">{asset.purchaseDate || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">状态</p>
                <div className="mt-1">
                  {asset.status === "active" ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      启用
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {asset.status || "未知"}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">保险 / 年审 / 营运证</p>
                <p className="mt-1 text-sm text-slate-900">
                  {(asset.insuranceExpiry || "—")} / {(asset.inspectionExpiry || "—")} / {(asset.operatingPermitExpiry || "—")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">里程 / 工时 / 下次保养</p>
                <p className="mt-1 text-sm text-slate-900">
                  {(asset.currentMileage || "—")} / {(asset.currentHours || "—")} / {(asset.nextMaintenanceMileage || "—")}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-500">扩展参数（metadata）</p>
              {metaEntries.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">—</p>
              ) : (
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white/80">
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {metaEntries.map(([k, v]) => (
                        <tr key={k} className="border-b border-slate-100 last:border-b-0">
                          <td className="w-32 px-3 py-2 text-xs font-medium text-slate-600">{k}</td>
                          <td className="px-3 py-2 text-sm text-slate-900">
                            {typeof v === "string" || typeof v === "number" || typeof v === "boolean"
                              ? String(v)
                              : JSON.stringify(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500">状态变更记录</p>
              {statusLogs.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">—</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {statusLogs.slice(0, 6).map((l) => (
                    <li key={l.id}>
                      {l.createdAt}：{l.fromStatus} → {l.toStatus}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")}>
              时间轴
            </TabButton>
            <TabButton active={tab === "reminders"} onClick={() => setTab("reminders")}>
              预警
            </TabButton>
          </div>

          {tab === "reminders" ? (
            <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md">
              <h3 className="mb-3 text-sm font-medium text-slate-800">预警</h3>
              {reminders.length === 0 ? (
                <p className="text-sm text-slate-500">
                  暂无预警（可在概览或「新增记录」页点击「新增预警」，或前往{" "}
                  <Link href="/reminders/new" className="underline decoration-slate-300 underline-offset-2">
                    新增预警
                  </Link>
                  ）。
                </p>
              ) : (
                <ul className="space-y-2">
                  {[...reminders]
                    .sort((a, b) => {
                      if (a.isNotified !== b.isNotified) return a.isNotified ? 1 : -1;
                      return a.dueDate.localeCompare(b.dueDate);
                    })
                    .map((r) => {
                      const level = alertLevel(r.dueDate, todayIso);
                      return (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-900">
                              {r.taskType}
                              {r.isNotified ? (
                                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                  已完成
                                </span>
                              ) : (
                                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                                  待处理
                                </span>
                              )}
                              <span className={"ml-2 rounded-full px-2 py-0.5 text-xs " + alertPill(level)}>
                                {alertLabel(level)}
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">到期：{r.dueDate}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {!r.isNotified ? (
                              <Button
                                type="button"
                                disabled={reminderPending}
                                className="h-8 border border-emerald-200 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500"
                                onClick={() =>
                                  startReminderTransition(async () => {
                                    await markReminderDone(r.id);
                                  })
                                }
                              >
                                完成
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              disabled={reminderPending}
                              className="h-8 border border-slate-200 bg-white/90 px-3 text-xs text-slate-700 hover:bg-slate-50"
                              onClick={() =>
                                startReminderTransition(async () => {
                                  await deleteReminder(r.id);
                                })
                              }
                            >
                              删除
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          ) : (
            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-800">时间轴</h3>
              <div className="mb-3 flex flex-wrap gap-2">
                <TabButton active={recordTypeFilter === "all"} onClick={() => setRecordTypeFilter("all")}>
                  全部
                </TabButton>
                {kinds.map((k) => (
                  <TabButton key={k} active={recordTypeFilter === k} onClick={() => setRecordTypeFilter(k)}>
                    {k}
                  </TabButton>
                ))}
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <TabButton active={recordProjectFilter === "all"} onClick={() => setRecordProjectFilter("all")}>
                  全部项目
                </TabButton>
                {availableProjects.map((p) => (
                  <TabButton key={p} active={recordProjectFilter === p} onClick={() => setRecordProjectFilter(p)}>
                    {p}
                  </TabButton>
                ))}
              </div>
              <ol className="relative border-l border-slate-200 pl-4">
                {filteredRecords.length === 0 ? (
                  <li className="text-sm text-slate-400">暂无记录</li>
                ) : (
                  filteredRecords.map((r) => (
                    <li key={r.id} className="relative mb-6 ml-1">
                      <div className="absolute -left-1.5 mt-1.5 h-2.5 w-2.5 rounded-full border border-emerald-300 bg-emerald-500" />
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-slate-900">
                            {r.type} · {r.date}
                          </p>
                          {r.project ? (
                            <p className="text-xs text-slate-500">
                              {r.project}
                              {r.projectChild ? ` / ${r.projectChild}` : ""}
                            </p>
                          ) : null}
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              className="text-xs text-slate-600 hover:text-slate-900"
                              onClick={() => {
                                setEditRecordId(r.id);
                                setRecType(r.type);
                                setRecProject(r.project ?? "");
                                setRecProjectChild(r.projectChild ?? "");
                                setRecDate(r.date);
                                setRecValue(r.value ?? "");
                                setRecCost(r.cost ?? "");
                                setRecOperator(r.operator ?? "");
                                setRecAssignee(r.assignee ?? "");
                                setRecVendor(r.vendor ?? "");
                                setRecNextPlanDate(r.nextPlanDate ?? "");
                                setRecNextPlanValue(r.nextPlanValue ?? "");
                                setRecPartsJson(r.partsJson ? JSON.stringify(r.partsJson, null, 2) : "");
                                setRecDescription(r.description ?? "");
                                setRecMsg(null);
                              }}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              className="text-xs text-rose-600 hover:text-rose-700"
                              onClick={() =>
                                startTransition(async () => {
                                  await deleteMaintenanceRecord(r.id, asset.id);
                                  if (editRecordId === r.id) setEditRecordId(null);
                                })
                              }
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      {r.description ? <p className="mt-1 text-xs text-slate-500">{r.description}</p> : null}
                      {r.cost ? <p className="mt-0.5 text-xs text-slate-400">费用 {r.cost}</p> : null}
                      {r.vendor ? <p className="mt-0.5 text-xs text-slate-400">维保单位 {r.vendor}</p> : null}
                      {r.assignee ? <p className="mt-0.5 text-xs text-slate-400">执行人 {r.assignee}</p> : null}
                      {r.nextPlanDate || r.nextPlanValue ? (
                        <p className="mt-0.5 text-xs text-slate-400">
                          下次计划 {r.nextPlanDate ?? "—"} {r.nextPlanValue ? `· ${r.nextPlanValue}` : ""}
                        </p>
                      ) : null}
                      {r.r2Key ? (
                        <p className="mt-1 text-xs">
                          <span className="mr-2 rounded-md bg-slate-900/5 px-1.5 py-0.5 text-[10px] text-slate-600">
                            {r.r2Key.toLowerCase().endsWith(".pdf") ? "PDF" : "图片/文件"}
                          </span>
                          <Link
                            className="text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                            href={`/file/${encodeURIComponent(r.r2Key).replace(/%2F/g, "/")}`}
                            target="_blank"
                          >
                            查看附件
                          </Link>
                        </p>
                      ) : null}

                        {editRecordId === r.id ? (
                          <form
                            className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white/70 p-3"
                            onSubmit={(e) => {
                              e.preventDefault();
                              setRecMsg(null);
                              startTransition(async () => {
                                const res = await updateMaintenanceRecord({
                                  id: r.id,
                                  assetId: asset.id,
                                  type: recType,
                                  project: recProject || undefined,
                                  projectChild: recProjectChild || undefined,
                                  date: recDate,
                                  value: recValue || undefined,
                                  cost: recCost || undefined,
                                  operator: recOperator || undefined,
                                  assignee: recAssignee || undefined,
                                  vendor: recVendor || undefined,
                                  nextPlanDate: recNextPlanDate || undefined,
                                  nextPlanValue: recNextPlanValue || undefined,
                                  partsJson: recPartsJson || undefined,
                                  description: recDescription || undefined,
                                });
                                if (res.ok) {
                                  setRecMsg("已保存");
                                  setEditRecordId(null);
                                } else {
                                  setRecMsg(res.error);
                                }
                              });
                            }}
                          >
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <div className="grid gap-1">
                                <Label>类型</Label>
                                <Input value={recType} onChange={(e) => setRecType(e.target.value)} required />
                              </div>
                              <div className="grid gap-1">
                                <Label>维保项目</Label>
                                <Select value={recProject || "__none__"} onValueChange={(v) => setRecProject(v === "__none__" ? "" : v)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="可选" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">不填写</SelectItem>
                                    {projects.map((p) => (
                                      <SelectItem key={p} value={p}>
                                        {p}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-1">
                                <Label>子分类</Label>
                                <Select
                                  value={recProjectChild || "__none__"}
                                  onValueChange={(v) => setRecProjectChild(v === "__none__" ? "" : v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="可选" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">不填写</SelectItem>
                                    {(projectChildren[recProject] ?? []).map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-1">
                                <Label>日期</Label>
                                <Input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} required />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div className="grid gap-1">
                                <Label>里程/小时</Label>
                                <Input value={recValue} onChange={(e) => setRecValue(e.target.value)} />
                              </div>
                              <div className="grid gap-1">
                                <Label>费用</Label>
                                <Input value={recCost} onChange={(e) => setRecCost(e.target.value)} />
                              </div>
                              <div className="grid gap-1">
                                <Label>经办人</Label>
                                <Input value={recOperator} onChange={(e) => setRecOperator(e.target.value)} />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div className="grid gap-1">
                                <Label>执行人</Label>
                                <Input value={recAssignee} onChange={(e) => setRecAssignee(e.target.value)} />
                              </div>
                              <div className="grid gap-1">
                                <Label>维保单位</Label>
                                <Input value={recVendor} onChange={(e) => setRecVendor(e.target.value)} />
                              </div>
                              <div className="grid gap-1">
                                <Label>下次计划日期</Label>
                                <Input type="date" value={recNextPlanDate} onChange={(e) => setRecNextPlanDate(e.target.value)} />
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="grid gap-1">
                                <Label>下次计划里程/工时</Label>
                                <Input value={recNextPlanValue} onChange={(e) => setRecNextPlanValue(e.target.value)} />
                              </div>
                              <div className="grid gap-1">
                                <Label>零件明细 JSON</Label>
                                <Input value={recPartsJson} onChange={(e) => setRecPartsJson(e.target.value)} placeholder='[{"name":"机油","cost":"120"}]' />
                              </div>
                            </div>
                            <div className="grid gap-1">
                              <Label>说明</Label>
                              <Textarea value={recDescription} onChange={(e) => setRecDescription(e.target.value)} rows={2} />
                            </div>
                            {recMsg ? <p className="text-xs text-amber-800">{recMsg}</p> : null}
                            <div className="flex gap-2">
                              <Button type="submit" disabled={pending} className="h-8 px-3 text-xs">
                                保存
                              </Button>
                              <Button
                                type="button"
                                disabled={pending}
                                className="h-8 border border-slate-200 bg-white/90 px-3 text-xs text-slate-700 hover:bg-slate-50"
                                onClick={() => setEditRecordId(null)}
                              >
                                取消
                              </Button>
                            </div>
                          </form>
                        ) : null}
                    </li>
                  ))
                )}
              </ol>
            </div>
          )}

          <form
            key={asset.id}
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 backdrop-blur-md"
          >
            <h3 className="text-sm font-medium text-slate-800">新增维保记录</h3>
            <input type="hidden" name="assetId" value={asset.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="m-type">类型</Label>
                <Select value={type} onValueChange={(v: string) => setType(v)}>
                  <SelectTrigger id="m-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kinds.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m-date">日期</Label>
                <Input
                  id="m-date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>维保项目（来自应用配置）</Label>
                <Select value={project || "__none__"} onValueChange={(v) => setProject(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="可选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">不填写</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>子分类（来自应用配置）</Label>
                <Select
                  value={projectChild || "__none__"}
                  onValueChange={(v) => setProjectChild(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="可选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">不填写</SelectItem>
                    {(projectChildren[project] ?? []).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="m-value">里程 / 小时</Label>
                <Input
                  id="m-value"
                  name="value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="可选"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m-cost">费用</Label>
                <Input
                  id="m-cost"
                  name="cost"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="可选"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="m-op">经办人</Label>
                <Input
                  id="m-op"
                  name="operator"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="m-assignee">执行人</Label>
                <Input id="m-assignee" name="assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="可选" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m-vendor">维保单位</Label>
                <Input id="m-vendor" name="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="可选" />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="m-next-date">下次计划日期</Label>
                <Input id="m-next-date" name="nextPlanDate" type="date" value={nextPlanDate} onChange={(e) => setNextPlanDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m-next-value">下次计划里程/工时</Label>
                <Input id="m-next-value" name="nextPlanValue" value={nextPlanValue} onChange={(e) => setNextPlanValue(e.target.value)} placeholder="可选" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-parts">费用明细/零件 JSON（可选）</Label>
              <Input id="m-parts" name="partsJson" value={partsJson} onChange={(e) => setPartsJson(e.target.value)} placeholder='[{"name":"机油","qty":"1","cost":"120"}]' />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-desc">说明</Label>
              <Textarea
                id="m-desc"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-file">附件（发票 / 照片 / PDF，最大 10MB）</Label>
              <Input
                id="m-file"
                name="file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (!f) return;
                  const mb = f.size / (1024 * 1024);
                  setUploadHint(`已选择：${f.name}（${mb.toFixed(2)}MB）`);
                }}
              />
              {uploadHint ? <p className="text-xs text-slate-500">{uploadHint}</p> : null}
            </div>
            {message ? <p className="text-xs text-amber-800">{message}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "提交中…" : "提交记录"}
            </Button>
          </form>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 backdrop-blur-md">
            <h3 className="text-sm font-medium text-slate-800">违章/事故</h3>
            <form
              className="mt-3 grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("assetId", asset.id);
                startTransition(async () => {
                  await createIncidentFromForm(fd);
                  const rows = await listIncidentsByAsset(asset.id);
                  setIncidents(rows.map((x) => ({ id: x.id, kind: x.kind, eventDate: x.eventDate, detail: x.detail ?? null })));
                  (e.target as HTMLFormElement).reset();
                });
              }}
            >
              <Input name="kind" placeholder="violation 或 accident" required />
              <Input name="eventDate" type="date" required />
              <Input name="location" placeholder="地点" />
              <Input name="penalty" placeholder="处罚/损失" />
              <Input name="status" placeholder="处理状态" />
              <Input name="claimAmount" placeholder="理赔金额" />
              <Input name="repairDetail" placeholder="维修情况" />
              <Input name="detail" placeholder="经过描述" />
              <Button type="submit" disabled={pending} className="h-8 px-3 text-xs sm:col-span-2">
                新增事件
              </Button>
            </form>
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {incidents.slice(0, 5).map((i) => (
                <li key={i.id}>
                  {i.eventDate} · {i.kind} · {i.detail ?? "—"}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 backdrop-blur-md">
            <h3 className="text-sm font-medium text-slate-800">故障代码记录（MTBF基础）</h3>
            <form
              className="mt-3 grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  await createFaultEvent({
                    assetId: asset.id,
                    faultCode: String(fd.get("faultCode") ?? "").trim(),
                    symptom: String(fd.get("symptom") ?? "").trim(),
                    eventDate: String(fd.get("eventDate") ?? "").trim(),
                    resolvedDate: String(fd.get("resolvedDate") ?? "").trim(),
                    isRework: String(fd.get("isRework") ?? "") === "on",
                  });
                  const rows = await listFaultsByAsset(asset.id);
                  setFaults(rows.map((x) => ({ id: x.id, faultCode: x.faultCode, eventDate: x.eventDate, resolvedDate: x.resolvedDate ?? null, isRework: x.isRework })));
                  (e.target as HTMLFormElement).reset();
                });
              }}
            >
              <Input name="faultCode" placeholder="故障代码，如 P001" required />
              <Input name="eventDate" type="date" required />
              <Input name="symptom" placeholder="故障现象" />
              <Input name="resolvedDate" type="date" />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" name="isRework" />
                返修
              </label>
              <Button type="submit" disabled={pending} className="h-8 px-3 text-xs">
                新增故障
              </Button>
            </form>
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {faults.slice(0, 5).map((f) => (
                <li key={f.id}>
                  {f.eventDate} · {f.faultCode} {f.isRework ? "·返修" : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
  );
}
