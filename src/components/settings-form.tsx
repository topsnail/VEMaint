"use client";

import { updateAppSettingsAction } from "@/app/actions/settings";
import type { AppSettings } from "@/lib/kv-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

function splitList(text: string): string[] {
  return text
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type SettingsFormProps = {
  initial: AppSettings;
};

export function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kindsText, setKindsText] = useState(initial.maintenanceKinds.join("，"));
  const [projectsText, setProjectsText] = useState(initial.maintenanceProjects.join("，"));
  const [childrenTextByParent, setChildrenTextByParent] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial.maintenanceProjectChildren)) {
      m[k] = v.join("，");
    }
    return m;
  });
  const [reminderTypesText, setReminderTypesText] = useState(initial.reminderTaskTypes.join("，"));
  const [windowDays, setWindowDays] = useState(String(initial.reminderWindowDays));
  const [leadRulesText, setLeadRulesText] = useState(
    Object.entries(initial.reminderLeadDaysByType ?? {})
      .map(([k, v]) => `${k}:${v}`)
      .join("\n"),
  );
  const [roleMode, setRoleMode] = useState<"admin" | "employee" | "viewer">(initial.roleMode ?? "admin");
  const [ledgerVehicleTypesText, setLedgerVehicleTypesText] = useState(initial.ledgerVehicleTypes.join("，"));
  const [ledgerUsageNaturesText, setLedgerUsageNaturesText] = useState(initial.ledgerUsageNatures.join("，"));
  const [msg, setMsg] = useState<string | null>(null);

  const projectParents = useMemo(() => splitList(projectsText), [projectsText]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const maintenanceProjectChildren: Record<string, string[]> = {};
      for (const p of splitList(projectsText)) {
        maintenanceProjectChildren[p] = splitList(childrenTextByParent[p] ?? "");
      }
      const res = await updateAppSettingsAction({
        maintenanceKindsText: kindsText,
        maintenanceProjectsText: projectsText,
        maintenanceProjectChildren,
        reminderTaskTypesText: reminderTypesText,
        reminderWindowDays: Number(windowDays),
        reminderLeadRulesText: leadRulesText,
        roleMode,
        ledgerVehicleTypesText,
        ledgerUsageNaturesText,
      });
      if (res.ok) {
        setMsg("已保存");
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full space-y-8 rounded-xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-md md:p-8"
    >
      <div className="space-y-2">
        <Label htmlFor="projects">维保项目（逗号或换行分隔）</Label>
        <Textarea
          id="projects"
          value={projectsText}
          onChange={(e) => setProjectsText(e.target.value)}
          rows={1}
          className="h-9 min-h-0 font-mono text-xs"
          placeholder="车辆，设备，检测仪器，其他"
        />
        <p className="text-xs text-slate-500">
          默认：车辆、设备、检测仪器、其他。可按需增删，保存后写入 KV。
        </p>
        {projectParents.length > 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-medium text-slate-700">各一级项目下的子分类（可选）</p>
            {projectParents.map((parent) => (
              <div key={parent} className="space-y-1 border-l-2 border-slate-200/90 pl-3">
                <Label htmlFor={`sub-${parent}`} className="text-xs text-slate-600">
                  「{parent}」子分类
                </Label>
                <Textarea
                  id={`sub-${parent}`}
                  value={childrenTextByParent[parent] ?? ""}
                  onChange={(e) =>
                    setChildrenTextByParent((prev) => ({ ...prev, [parent]: e.target.value }))
                  }
                  rows={1}
                  className="h-9 min-h-0 font-mono text-xs"
                  placeholder="逗号或换行分隔，如：货车，小车"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ledger-vtypes">车辆台账 · 车辆类型（逗号或换行分隔）</Label>
          <Textarea
            id="ledger-vtypes"
            value={ledgerVehicleTypesText}
            onChange={(e) => setLedgerVehicleTypesText(e.target.value)}
            rows={2}
            className="min-h-0 font-mono text-xs"
            placeholder="轿车，SUV，轻型货车…"
          />
          <p className="text-xs text-slate-500">用于「新增车辆」中车辆类型下拉；保存后写入 KV。</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ledger-unatures">车辆台账 · 使用性质（逗号或换行分隔）</Label>
          <Textarea
            id="ledger-unatures"
            value={ledgerUsageNaturesText}
            onChange={(e) => setLedgerUsageNaturesText(e.target.value)}
            rows={2}
            className="min-h-0 font-mono text-xs"
            placeholder="非营运，营运，货运…"
          />
          <p className="text-xs text-slate-500">对应行驶证「使用性质」字段下拉选项；台账内仍可留空。</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kinds">维保类型（逗号或换行分隔）</Label>
          <Textarea
            id="kinds"
            value={kindsText}
            onChange={(e) => setKindsText(e.target.value)}
            rows={2}
            className="min-h-0 font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reminderTypes">预警任务类型推荐（逗号或换行分隔）</Label>
          <Textarea
            id="reminderTypes"
            value={reminderTypesText}
            onChange={(e) => setReminderTypesText(e.target.value)}
            rows={2}
            className="min-h-0 font-mono text-xs"
          />
          <p className="text-xs text-slate-500">用于「新增预警」下拉推荐（仍可手动输入）。</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="win">预警进度条窗口（天）</Label>
          <Input
            id="win"
            type="number"
            min={7}
            max={365}
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value)}
          />
          <p className="text-xs text-slate-500">用于仪表盘「接近到期」进度，默认 30 天。</p>
        </div>
        <div className="space-y-2">
          <Label>权限模式（轻量）</Label>
          <Select value={roleMode} onValueChange={(v: "admin" | "employee" | "viewer") => setRoleMode(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">管理员（全操作）</SelectItem>
              <SelectItem value="employee">员工（可新增/编辑，不可删）</SelectItem>
              <SelectItem value="viewer">访客（只读）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="leadRules">提醒提前天数规则（每行 类型:天数）</Label>
        <Textarea
          id="leadRules"
          value={leadRulesText}
          onChange={(e) => setLeadRulesText(e.target.value)}
          rows={4}
          className="font-mono text-xs"
          placeholder={"年审:60\n保险:60\n保养:30"}
        />
      </div>
      {msg ? <p className="text-xs text-emerald-700">{msg}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "保存中…" : "保存到 KV"}
      </Button>
    </form>
  );
}
