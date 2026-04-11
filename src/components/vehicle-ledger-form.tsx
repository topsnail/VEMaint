"use client";

import { createVehicleLedger, updateVehicleLedger, type VehicleLedgerInput } from "@/app/actions/vehicle-ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FUEL_TYPES,
  isTruckType,
  joinOverallDimensionsMm,
  parseOverallDimensionsMm,
  USAGE_STATUS,
  VEHICLE_CERTIFICATE_TEXT_FIELDS,
  VEHICLE_LEDGER_EMPTY,
  VEHICLE_OPERATIONS_TEXT_FIELDS,
} from "@/lib/vehicle-ledger";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

function normalizeLedgerFormSnapshot(f: VehicleLedgerInput): Record<string, string> {
  const keys = Object.keys(VEHICLE_LEDGER_EMPTY) as (keyof VehicleLedgerInput)[];
  return Object.fromEntries(keys.map((k) => [k, String(f[k] ?? "").trim()]));
}

function isLedgerFormDirty(current: VehicleLedgerInput, baseline: VehicleLedgerInput | null): boolean {
  if (!baseline) return false;
  return JSON.stringify(normalizeLedgerFormSnapshot(current)) !== JSON.stringify(normalizeLedgerFormSnapshot(baseline));
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  unit,
  hint,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1">
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <div className={unit ? "flex min-w-0 items-center gap-2" : undefined}>
        <Input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={unit ? "min-w-0 flex-1" : undefined}
        />
        {unit ? (
          <span className="shrink-0 select-none text-sm tabular-nums text-slate-500" aria-hidden>
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function OverallDimensionsFields({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const [l, w, h] = parseOverallDimensionsMm(value);
  function setPart(index: 0 | 1 | 2, raw: string) {
    const digits = raw.replace(/\D/g, "");
    const cur = parseOverallDimensionsMm(value);
    const next: [string, string, string] = [...cur];
    next[index] = digits;
    onChange(joinOverallDimensionsMm(next[0], next[1], next[2]));
  }
  return (
    <div className="grid gap-1 md:col-span-2">
      <Label>外廓尺寸</Label>
      <p className="text-xs text-slate-500">长、宽、高分别填写毫米数字即可；中间的 × 仅作分隔显示，不必输入。</p>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={l}
          onChange={(e) => setPart(0, e.target.value)}
          className="min-w-0 w-[5.5rem] sm:flex-1 sm:max-w-[8rem]"
          placeholder="长"
          aria-label="外廓长度毫米"
        />
        <span className="select-none text-slate-400" aria-hidden>
          ×
        </span>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={w}
          onChange={(e) => setPart(1, e.target.value)}
          className="min-w-0 w-[5.5rem] sm:flex-1 sm:max-w-[8rem]"
          placeholder="宽"
          aria-label="外廓宽度毫米"
        />
        <span className="select-none text-slate-400" aria-hidden>
          ×
        </span>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={h}
          onChange={(e) => setPart(2, e.target.value)}
          className="min-w-0 w-[5.5rem] sm:flex-1 sm:max-w-[8rem]"
          placeholder="高"
          aria-label="外廓高度毫米"
        />
        <span className="shrink-0 text-sm tabular-nums text-slate-500" aria-hidden>
          mm
        </span>
      </div>
    </div>
  );
}

function mergeOptionList(options: string[], current: string | undefined): string[] {
  const c = current?.trim();
  if (!c) return options;
  if (options.includes(c)) return options;
  return [...options, c];
}

const USAGE_NATURE_NONE = "__ledger_usage_none__";

export function VehicleLedgerForm({
  mode,
  vehicleId,
  initialForm,
  ledgerVehicleTypes,
  ledgerUsageNatures,
}: {
  mode: "create" | "edit";
  vehicleId?: string;
  initialForm: VehicleLedgerInput;
  ledgerVehicleTypes: string[];
  ledgerUsageNatures: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<VehicleLedgerInput>(initialForm);
  const [baseline] = useState(() => structuredClone(initialForm));
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const skipUnloadRef = useRef(false);

  const editingId = mode === "edit" ? vehicleId : undefined;

  function set<K extends keyof VehicleLedgerInput>(k: K, v: VehicleLedgerInput[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const dirty = isLedgerFormDirty(form, baseline);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (skipUnloadRef.current || !dirty) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const vehicleTypeSelectOptions = useMemo(
    () => mergeOptionList(ledgerVehicleTypes.length ? ledgerVehicleTypes : [VEHICLE_LEDGER_EMPTY.vehicleType], form.vehicleType),
    [ledgerVehicleTypes, form.vehicleType],
  );
  const usageNatureSelectOptions = useMemo(
    () => mergeOptionList(ledgerUsageNatures, form.usageNature),
    [ledgerUsageNatures, form.usageNature],
  );

  function tryNavigateBack() {
    if (dirty && !window.confirm("有未保存的修改，确定返回？")) return;
    skipUnloadRef.current = true;
    router.push("/vehicle-ledger");
  }

  function save() {
    setMsg("");
    if (isTruckType(form.vehicleType) && !form.ratedLoad?.trim()) {
      setMsg("货车类型时「核定载重」必填");
      return;
    }
    startTransition(async () => {
      const res = editingId ? await updateVehicleLedger(editingId, form) : await createVehicleLedger(form);
      if (!res.ok) return setMsg(res.error);
      skipUnloadRef.current = true;
      router.push("/vehicle-ledger");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-12 md:p-8">
      <div>
        <button
          type="button"
          onClick={tryNavigateBack}
          className="text-left text-sm text-slate-500 hover:text-slate-900"
        >
          ← 返回车辆台账
        </button>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
          {mode === "edit" ? "编辑车辆" : "新增车辆"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">车辆台账基础档案维护</p>
      </div>

      <div className="space-y-6 rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md md:p-6">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">登记信息（与行驶证字段顺序一致）</p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <Field label="号牌号码*" value={form.plateNo} onChange={(v) => set("plateNo", v)} />
            <div className="grid gap-1">
              <Label>车辆类型*</Label>
              <Select value={form.vehicleType} onValueChange={(v) => set("vehicleType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vehicleTypeSelectOptions.map((x) => (
                    <SelectItem key={x} value={x}>{x}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {VEHICLE_CERTIFICATE_TEXT_FIELDS.slice(0, 2).map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={form[f.key] as string | undefined}
                onChange={(v) => set(f.key, v)}
                type={f.type ?? "text"}
                unit={f.unit}
              />
            ))}
            <div className="grid gap-1">
              <Label>使用性质</Label>
              <Select
                value={form.usageNature?.trim() ? form.usageNature : USAGE_NATURE_NONE}
                onValueChange={(v) => set("usageNature", v === USAGE_NATURE_NONE ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="可选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={USAGE_NATURE_NONE}>（未填）</SelectItem>
                  {usageNatureSelectOptions.map((x) => (
                    <SelectItem key={x} value={x}>{x}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {VEHICLE_CERTIFICATE_TEXT_FIELDS.slice(2).map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={form[f.key] as string | undefined}
                onChange={(v) => set(f.key, v)}
                type={f.type ?? "text"}
                unit={f.unit}
              />
            ))}
            <OverallDimensionsFields value={form.overallDimensions} onChange={(v) => set("overallDimensions", v)} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">内部台账与维保</p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {VEHICLE_OPERATIONS_TEXT_FIELDS.map((f) => {
              if (f.key === "internalNo") {
                return (
                  <Field
                    key={f.key}
                    label={f.label}
                    hint="企业内部资产编号，可与行驶证无关。"
                    value={form.internalNo}
                    onChange={(v) => set("internalNo", v)}
                    type="text"
                  />
                );
              }
              if (f.key === "ratedLoad") {
                const truck = isTruckType(form.vehicleType);
                return (
                  <Field
                    key={f.key}
                    label={truck ? "核定载重*" : "核定载重"}
                    hint={truck ? "货车类型时必填，请填写核定载质量（如吨）。" : undefined}
                    value={form.ratedLoad}
                    onChange={(v) => set("ratedLoad", v)}
                    type="text"
                  />
                );
              }
              return (
                <Field
                  key={f.key}
                  label={f.label}
                  value={form[f.key] as string | undefined}
                  onChange={(v) => set(f.key, v)}
                  type={f.type ?? "text"}
                />
              );
            })}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="grid gap-1">
              <Label>燃油类型*</Label>
              <Select value={form.fuelType} onValueChange={(v) => set("fuelType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FUEL_TYPES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>使用状态</Label>
              <Select value={form.usageStatus} onValueChange={(v) => set("usageStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{USAGE_STATUS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-1"><Label>险种备注</Label><Textarea rows={2} value={form.insuranceRemark} onChange={(e) => set("insuranceRemark", e.target.value)} /></div>
          <div className="grid gap-1"><Label>历史常见故障</Label><Textarea rows={2} value={form.commonFaults} onChange={(e) => set("commonFaults", e.target.value)} /></div>
        </div>
        <div className="grid gap-1"><Label>备注说明</Label><Textarea rows={2} value={form.remark} onChange={(e) => set("remark", e.target.value)} /></div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/90 pt-6">
        {msg ? <p className="w-full text-xs text-rose-700">{msg}</p> : null}
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "保存中..." : mode === "edit" ? "更新" : "新增"}
        </Button>
        <Button type="button" variant="outline" className="border-slate-200 bg-white text-slate-700" onClick={tryNavigateBack}>
          取消
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400 md:hidden">
        <Link href="/vehicle-ledger" className="text-slate-500 hover:text-slate-700">返回列表</Link>
      </p>
    </div>
  );
}
