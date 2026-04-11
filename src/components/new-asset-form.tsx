"use client";

import { createAsset } from "@/app/actions/assets";
import { getAppSettingsAction, getAssetFieldsConfigAction } from "@/app/actions/settings";
import type { AssetRow } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

export function NewAssetForm({ templates }: { templates: AssetRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("车辆");
  const [identifier, setIdentifier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [inspectionExpiry, setInspectionExpiry] = useState("");
  const [operatingPermitExpiry, setOperatingPermitExpiry] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");
  const [currentHours, setCurrentHours] = useState("");
  const [nextMaintenanceMileage, setNextMaintenanceMileage] = useState("");
  const [status, setStatus] = useState("active");
  const [metadataJson, setMetadataJson] = useState("");
  const [dyn, setDyn] = useState<Record<string, string>>({});
  const [fieldDefs, setFieldDefs] = useState<{ key: string; label: string; type: string; required?: boolean; placeholder?: string }[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [projectChildren, setProjectChildren] = useState<Record<string, string[]>>({});
  const [project, setProject] = useState("");
  const [projectChild, setProjectChild] = useState("");
  const [templateId, setTemplateId] = useState("__none__");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getAssetFieldsConfigAction();
        if (cancelled) return;
        const defs = cfg.byType[type as "车辆" | "机械"] ?? [];
        setFieldDefs(defs);
      } catch {
        if (cancelled) return;
        setFieldDefs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
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
        const firstChild = (nextChildren[first] ?? [])[0] ?? "";
        setProjectChild(firstChild);
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
  }, []);

  useEffect(() => {
    const list = projectChildren[project] ?? [];
    setProjectChild((prev) => (prev && list.includes(prev) ? prev : list[0] ?? ""));
  }, [project, projectChildren]);

  useEffect(() => {
    if (templateId === "__none__") return;
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setName(t.name);
    setType(t.type === "机械" ? "机械" : "车辆");
    setIdentifier(t.identifier);
    setPurchaseDate(t.purchaseDate ?? "");
    setStatus(t.status ?? "active");
    setInsuranceExpiry(t.insuranceExpiry ?? "");
    setInspectionExpiry(t.inspectionExpiry ?? "");
    setOperatingPermitExpiry(t.operatingPermitExpiry ?? "");
    setCurrentMileage(t.currentMileage ?? "");
    setCurrentHours(t.currentHours ?? "");
    setNextMaintenanceMileage(t.nextMaintenanceMileage ?? "");
    setMetadataJson(t.metadata ? JSON.stringify(t.metadata, null, 2) : "");
    const p = typeof t.metadata?.["维保项目"] === "string" ? String(t.metadata?.["维保项目"]) : "";
    const c = typeof t.metadata?.["项目子类"] === "string" ? String(t.metadata?.["项目子类"]) : "";
    setProject(p);
    setProjectChild(c);
  }, [templateId, templates]);

  const mergedMetadataJson = useMemo(() => {
    const base = metadataJson?.trim();
    let obj: Record<string, unknown> = {};
    if (base) {
      try {
        const v = JSON.parse(base) as unknown;
        if (v && typeof v === "object" && !Array.isArray(v)) obj = v as Record<string, unknown>;
      } catch {
        // ignore
      }
    }
    for (const [k, v] of Object.entries(dyn)) {
      if (v?.trim()) obj[k] = v.trim();
    }
    if (project) obj["维保项目"] = project;
    if (projectChild) obj["项目子类"] = projectChild;
    return Object.keys(obj).length ? JSON.stringify(obj, null, 2) : "";
  }, [metadataJson, dyn, project, projectChild]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createAsset({
        name,
        type,
        identifier,
        purchaseDate: purchaseDate || undefined,
        insuranceExpiry: insuranceExpiry || undefined,
        inspectionExpiry: inspectionExpiry || undefined,
        operatingPermitExpiry: operatingPermitExpiry || undefined,
        currentMileage: currentMileage || undefined,
        currentHours: currentHours || undefined,
        nextMaintenanceMileage: nextMaintenanceMileage || undefined,
        status: status || undefined,
        metadataJson: mergedMetadataJson || undefined,
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-12 md:p-8">
      <div>
        <Link href="/devices" className="text-sm text-slate-500 hover:text-slate-900">
          ← 设备列表
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">新增设备</h1>
        <p className="mt-1 text-sm text-slate-500">写入 D1 台账，类型限定为车辆或工程机械。</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md md:p-6">
        <div className="grid gap-2">
          <Label>从已有资产复制（可选）</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="选择后自动带出档案" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">不复制</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} · {t.identifier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="na-name">名称</Label>
            <Input id="na-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="例如 轻型货车 A1" />
          </div>
          <div className="grid gap-2">
            <Label>类型</Label>
            <Select value={type} onValueChange={setType}>
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
            <Label>维保项目</Label>
            <Select value={project || "__none__"} onValueChange={(v) => setProject(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="从应用配置中选择" />
              </SelectTrigger>
              <SelectContent>
                {projects.length ? (
                  projects.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none__">未配置</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>项目子类（可选）</Label>
            <Select value={projectChild || "__none__"} onValueChange={(v) => setProjectChild(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="从应用配置中选择" />
              </SelectTrigger>
              <SelectContent>
                {(projectChildren[project] ?? []).length ? (
                  (projectChildren[project] ?? []).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none__">无</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="na-id">车牌 / 机号</Label>
            <Input id="na-id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="na-pd">购置日期</Label>
            <Input id="na-pd" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>保险到期</Label>
            <Input type="date" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>年审到期</Label>
            <Input type="date" value={inspectionExpiry} onChange={(e) => setInspectionExpiry(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>营运证到期</Label>
            <Input type="date" value={operatingPermitExpiry} onChange={(e) => setOperatingPermitExpiry(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>下次保养里程</Label>
            <Input value={nextMaintenanceMileage} onChange={(e) => setNextMaintenanceMileage(e.target.value)} placeholder="如 120000" />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>当前里程</Label>
            <Input value={currentMileage} onChange={(e) => setCurrentMileage(e.target.value)} placeholder="车辆可填" />
          </div>
          <div className="grid gap-2">
            <Label>当前工时</Label>
            <Input value={currentHours} onChange={(e) => setCurrentHours(e.target.value)} placeholder="机械可填" />
          </div>
        </div>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="na-st">状态</Label>
          <Input id="na-st" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="active" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="na-meta">扩展参数（JSON 对象，可选）</Label>
          <Textarea
            id="na-meta"
            value={metadataJson}
            onChange={(e) => setMetadataJson(e.target.value)}
            rows={3}
            className="font-mono text-xs"
            placeholder='{"载重":"1.5t"}'
          />
        </div>
        {fieldDefs.length ? (
          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-sm backdrop-blur-md">
            <p className="mb-3 text-xs font-medium text-slate-700">动态字段（来自 KV）</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fieldDefs.map((f) => (
                <div key={f.key} className="grid gap-1">
                  <Label>
                    {f.label}
                    {f.required ? <span className="ml-1 text-rose-600">*</span> : null}
                  </Label>
                  <Input
                    value={dyn[f.key] ?? ""}
                    onChange={(e) => setDyn((prev) => ({ ...prev, [f.key]: e.target.value }))}
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
        {msg ? <p className="text-xs text-amber-800">{msg}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "保存中…" : "保存"}
          </Button>
          <Button type="button" variant="outline" className="border-slate-200 bg-white" asChild>
            <Link href="/">取消</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
