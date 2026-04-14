"use client";

import { updateAppSettingsAction } from "@/app/actions/settings";
import {
  createUserAction,
  listUsersAction,
  setUserDisabledAction,
  setUserPasswordAction,
  setUserRoleAction,
} from "@/app/actions/auth";
import type { AppSettings } from "@/lib/kv-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { listAuditLogsAction, type AuditLogRow } from "@/app/actions/audit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

function splitList(text: string): string[] {
  return text
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type SettingsFormProps = {
  initial: AppSettings;
};

type SettingsTab = "roles" | "maintenance" | "reminders" | "ledger" | "io";

const SETTINGS_TABS: { key: SettingsTab; label: string; hint: string }[] = [
  { key: "roles", label: "权限与角色", hint: "权限策略与当前模式" },
  { key: "maintenance", label: "维保配置", hint: "类型、项目与子分类" },
  { key: "reminders", label: "提醒配置", hint: "预警窗口与提前规则" },
  { key: "ledger", label: "车辆台账", hint: "车辆类型与使用性质" },
  { key: "io", label: "导入导出", hint: "Excel 规则与使用说明" },
];

function SectionCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-xl border border-border bg-background/40 p-4 md:p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-xs leading-5 text-slate-500">{desc}</p>
      </div>
      {children}
    </section>
  );
}

export function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<SettingsTab>("maintenance");
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
  const [users, setUsers] = useState<
    { id: string; username: string; role: "admin" | "employee" | "viewer"; disabled: boolean; createdAt: string; updatedAt: string }[]
  >([]);
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "employee" | "viewer">("viewer");
  const [resetPwdByUserId, setResetPwdByUserId] = useState<Record<string, string>>({});
  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([]);
  const [auditQ, setAuditQ] = useState("");
  const [auditOffset, setAuditOffset] = useState(0);
  const auditLimit = 50;
  const [auditMsg, setAuditMsg] = useState<string | null>(null);
  const [auditDetailOpen, setAuditDetailOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditLogRow | null>(null);

  function roleLabel(role: string | null | undefined) {
    if (role === "admin") return "管理员";
    if (role === "employee") return "员工";
    if (role === "viewer") return "访客";
    return "—";
  }

  function actionLabel(action: string) {
    const map: Record<string, string> = {
      "settings.update": "修改系统设置",
      "assets.import_excel": "导入资产（电子表格）",
      "users.create": "新增用户",
      "users.set_role": "修改用户角色",
      "users.reset_password": "重置用户密码",
      "users.set_disabled": "启用/禁用用户",
    };
    return map[action] ?? `未分类操作（${action}）`;
  }

  const projectParents = useMemo(() => splitList(projectsText), [projectsText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listUsersAction();
      if (cancelled) return;
      if (res.ok) setUsers(res.users);
      else setUserMsg(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listAuditLogsAction({ q: auditQ, limit: auditLimit, offset: auditOffset });
      if (cancelled) return;
      if (res.ok) {
        setAuditRows(res.rows);
        setAuditMsg(null);
      } else {
        setAuditRows([]);
        setAuditMsg(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditQ, auditOffset]);

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
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full space-y-8 rounded-xl border border-border bg-card p-6 shadow-sm md:p-8"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-background/60 p-2">
          <div className="grid gap-2 md:grid-cols-5">
            {SETTINGS_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    "rounded-lg border px-3 py-3 text-left transition " +
                    (active
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-transparent bg-transparent text-slate-600 hover:border-border hover:bg-card hover:text-slate-900")
                  }
                >
                  <div className="text-sm font-medium">{tab.label}</div>
                  <div className="mt-1 text-[11px] leading-4 opacity-80">{tab.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "roles" ? (
          <SectionCard
            title="权限与角色"
            desc="权限以“登录用户角色”为准。下方“默认权限模式”仅在系统尚未启用账号体系时作为兜底/演示使用。"
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>默认权限模式（兜底/演示）</Label>
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
                <p className="text-xs text-slate-500">当系统已创建用户并启用登录后，这里不再作为实际权限来源。</p>
              </div>
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                <p className="font-medium text-slate-800">权限说明</p>
                <p className="mt-2">管理员：可新增、编辑、删除、修改系统设置。</p>
                <p>员工：可新增、编辑业务数据，但不可删除。</p>
                <p>访客：只读查看，不可新增、编辑、删除。</p>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">用户与登录权限（管理员）</p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 border-slate-200 bg-white text-xs"
                  onClick={async () => {
                    const res = await listUsersAction();
                    if (res.ok) {
                      setUsers(res.users);
                      setUserMsg("用户列表已刷新");
                    } else {
                      setUserMsg(res.error);
                    }
                  }}
                >
                  刷新列表
                </Button>
              </div>

              <div className="grid gap-3 rounded-lg border border-dashed border-slate-200 p-3 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">用户名</Label>
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="例如：张三" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">初始密码</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少6位"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">角色</Label>
                  <Select value={newRole} onValueChange={(v: "admin" | "employee" | "viewer") => setNewRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="employee">员工</SelectItem>
                      <SelectItem value="viewer">访客</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={async () => {
                      setUserMsg(null);
                      const res = await createUserAction({
                        username: newUsername,
                        password: newPassword,
                        role: newRole,
                      });
                      if (!res.ok) {
                        setUserMsg(res.error);
                        return;
                      }
                      setNewUsername("");
                      setNewPassword("");
                      const listRes = await listUsersAction();
                      if (listRes.ok) setUsers(listRes.users);
                      setUserMsg("用户创建成功");
                    }}
                  >
                    新增用户
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1.6fr_1fr_1.2fr_1.2fr]">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">{u.username}</p>
                      <p className="text-[11px] text-slate-500">
                        创建：{new Date(u.createdAt).toLocaleString()} · 更新：{new Date(u.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">角色</Label>
                      <Select
                        value={u.role}
                        onValueChange={async (v: "admin" | "employee" | "viewer") => {
                          const res = await setUserRoleAction({ userId: u.id, role: v });
                          if (!res.ok) {
                            setUserMsg(res.error);
                            return;
                          }
                          setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: v } : x)));
                          setUserMsg(`已更新 ${u.username} 的角色`);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">管理员</SelectItem>
                          <SelectItem value="employee">员工</SelectItem>
                          <SelectItem value="viewer">访客</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">重置密码</Label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={resetPwdByUserId[u.id] ?? ""}
                          onChange={(e) =>
                            setResetPwdByUserId((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          placeholder="新密码"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-200 bg-white"
                          onClick={async () => {
                            const pwd = resetPwdByUserId[u.id] ?? "";
                            const res = await setUserPasswordAction({ userId: u.id, password: pwd });
                            if (!res.ok) {
                              setUserMsg(res.error);
                              return;
                            }
                            setResetPwdByUserId((prev) => ({ ...prev, [u.id]: "" }));
                            setUserMsg(`已重置 ${u.username} 的密码`);
                          }}
                        >
                          重置
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">状态</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className={
                          "w-full " +
                          (u.disabled
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700")
                        }
                        onClick={async () => {
                          const next = !u.disabled;
                          const res = await setUserDisabledAction({ userId: u.id, disabled: next });
                          if (!res.ok) {
                            setUserMsg(res.error);
                            return;
                          }
                          setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, disabled: next } : x)));
                          setUserMsg(`${u.username} 已${next ? "禁用" : "启用"}`);
                        }}
                      >
                        {u.disabled ? "已禁用（点此启用）" : "已启用（点此禁用）"}
                      </Button>
                    </div>
                  </div>
                ))}
                {users.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                    暂无用户。请先新增一个管理员账号用于登录。
                  </p>
                ) : null}
              </div>
              {userMsg ? <p className="text-xs text-primary">{userMsg}</p> : null}
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">操作日志</p>
                  <p className="mt-1 text-xs text-slate-500">记录系统配置、导入、用户管理等关键操作（仅管理员可见）。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={auditQ}
                    onChange={(e) => {
                      setAuditOffset(0);
                      setAuditQ(e.target.value);
                    }}
                    placeholder="搜索 操作 / 用户 / 目标"
                    className="h-8 w-[min(280px,70vw)]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-slate-200 bg-white text-xs"
                    onClick={async () => {
                      const res = await listAuditLogsAction({ q: auditQ, limit: auditLimit, offset: auditOffset });
                      if (res.ok) {
                        setAuditRows(res.rows);
                        setAuditMsg("日志已刷新");
                      } else setAuditMsg(res.error);
                    }}
                  >
                    刷新
                  </Button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 border-b border-border bg-muted [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
                    <TableRow>
                      <TableHead className="min-w-[9rem]">时间</TableHead>
                      <TableHead className="min-w-[6rem]">用户</TableHead>
                      <TableHead className="min-w-[7rem]">动作</TableHead>
                      <TableHead className="min-w-[8rem]">目标</TableHead>
                      <TableHead>摘要</TableHead>
                      <TableHead className="w-[6rem] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditRows.map((r, i) => (
                      <TableRow key={r.id} className={i % 2 ? "bg-white" : "bg-slate-50/40"}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-600">
                          {new Date(r.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-700">
                          {(r.actorUsername ?? "—") + (r.actorRole ? ` · ${roleLabel(r.actorRole)}` : "")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs font-medium text-slate-800" title={r.action}>
                          {actionLabel(r.action)}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-xs text-slate-700" title={r.target ?? ""}>
                          {r.target ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[24rem] truncate text-xs text-slate-600" title={r.detail ? JSON.stringify(r.detail) : ""}>
                          {r.detail ? JSON.stringify(r.detail) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-7 border-slate-200 bg-white px-2 text-[11px]"
                            onClick={() => {
                              setSelectedAudit(r);
                              setAuditDetailOpen(true);
                            }}
                          >
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {auditRows.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                          {auditMsg ?? "暂无日志"}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 border-slate-200 bg-white px-3 text-xs"
                  disabled={auditOffset <= 0}
                  onClick={() => setAuditOffset((v) => Math.max(0, v - auditLimit))}
                >
                  上一页
                </Button>
                <span className="text-xs text-slate-500">{auditOffset / auditLimit + 1}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 border-slate-200 bg-white px-3 text-xs"
                  disabled={auditRows.length < auditLimit}
                  onClick={() => setAuditOffset((v) => v + auditLimit)}
                >
                  下一页
                </Button>
              </div>

              {auditMsg ? <p className="text-xs text-primary">{auditMsg}</p> : null}
            </div>

            <Sheet
              open={auditDetailOpen}
              onOpenChange={(open) => {
                setAuditDetailOpen(open);
                if (!open) setSelectedAudit(null);
              }}
            >
              <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl lg:max-w-2xl">
                <SheetHeader className="shrink-0 space-y-1 border-b border-slate-200 px-6 py-4 text-left">
                  <SheetTitle>操作日志详情</SheetTitle>
                </SheetHeader>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  {selectedAudit ? (
                    <>
                      <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-xs text-slate-700">
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] text-slate-500">时间</p>
                            <p className="font-medium">{new Date(selectedAudit.createdAt).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500">用户</p>
                            <p className="font-medium">
                              {(selectedAudit.actorUsername ?? "—") + (selectedAudit.actorRole ? ` · ${roleLabel(selectedAudit.actorRole)}` : "")}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500">动作</p>
                            <p className="font-medium" title={selectedAudit.action}>{actionLabel(selectedAudit.action)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500">目标</p>
                            <p className="font-medium">{selectedAudit.target ?? "—"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900">详情（结构化数据）</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 border-slate-200 bg-white text-xs"
                            onClick={async () => {
                              const text = selectedAudit.detail ? JSON.stringify(selectedAudit.detail, null, 2) : "";
                              try {
                                await navigator.clipboard.writeText(text);
                                setAuditMsg("已复制详情");
                              } catch {
                                setAuditMsg("复制失败");
                              }
                            }}
                          >
                            复制
                          </Button>
                        </div>
                        <pre className="max-h-[50vh] overflow-auto rounded-lg border border-border bg-slate-50 p-3 text-[11px] leading-5 text-slate-700">
                          {selectedAudit.detail ? JSON.stringify(selectedAudit.detail, null, 2) : "—"}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">未选择日志</p>
                  )}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
                  <Button type="button" variant="outline" className="border-slate-200 bg-white" onClick={() => setAuditDetailOpen(false)}>
                    关闭
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </SectionCard>
        ) : null}

        {activeTab === "maintenance" ? (
          <SectionCard
            title="维保配置"
            desc="影响资产新增、维保记录录入、筛选与统计。建议先维护一级项目，再维护其下的子分类。"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kinds">维保类型（逗号或换行分隔）</Label>
                <Textarea
                  id="kinds"
                  value={kindsText}
                  onChange={(e) => setKindsText(e.target.value)}
                  rows={3}
                  className="min-h-0 font-mono text-xs"
                  placeholder="保险，年审，保养，维修"
                />
                <p className="text-xs text-slate-500">用于维保记录类型下拉、仪表盘统计与提醒规则匹配。</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projects">维保项目（逗号或换行分隔）</Label>
                <Textarea
                  id="projects"
                  value={projectsText}
                  onChange={(e) => setProjectsText(e.target.value)}
                  rows={3}
                  className="min-h-0 font-mono text-xs"
                  placeholder="车辆，设备，检测仪器，其他"
                />
                <p className="text-xs text-slate-500">默认：车辆、设备、检测仪器、其他。可按需增删，保存后写入系统配置。</p>
              </div>
            </div>

            {projectParents.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-800">项目子分类</p>
                <div className="grid gap-3 lg:grid-cols-2">
                  {projectParents.map((parent) => (
                    <div key={parent} className="space-y-1 rounded-lg border border-slate-200 p-3">
                      <Label htmlFor={`sub-${parent}`} className="text-xs text-slate-700">
                        「{parent}」子分类
                      </Label>
                      <Textarea
                        id={`sub-${parent}`}
                        value={childrenTextByParent[parent] ?? ""}
                        onChange={(e) =>
                          setChildrenTextByParent((prev) => ({ ...prev, [parent]: e.target.value }))
                        }
                        rows={2}
                        className="min-h-0 font-mono text-xs"
                        placeholder="逗号或换行分隔，如：货车，小车"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === "reminders" ? (
          <SectionCard
            title="提醒配置"
            desc="用于提醒生成、仪表盘预警进度和快捷录入推荐。建议把窗口天数与提前规则一起维护，避免策略不一致。"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reminderTypes">预警任务类型推荐（逗号或换行分隔）</Label>
                <Textarea
                  id="reminderTypes"
                  value={reminderTypesText}
                  onChange={(e) => setReminderTypesText(e.target.value)}
                  rows={3}
                  className="min-h-0 font-mono text-xs"
                  placeholder="年审，保险，保养"
                />
                <p className="text-xs text-slate-500">用于「新增预警」下拉推荐，仍支持手动输入其它类型。</p>
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
                <p className="text-xs text-slate-500">用于仪表盘“接近到期”进度计算，建议设置为 30~90 天。</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadRules">提醒提前天数规则（每行 类型:天数）</Label>
              <Textarea
                id="leadRules"
                value={leadRulesText}
                onChange={(e) => setLeadRulesText(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                placeholder={"年审:60\n保险:60\n保养:30"}
              />
              <p className="text-xs text-slate-500">示例：年审:60，表示距离到期 60 天时进入提醒窗口。</p>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "ledger" ? (
          <SectionCard
            title="车辆台账"
            desc="影响车辆台账、车辆新增页面与相关下拉字段。建议这里维护通用字典，不要混入临时值。"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ledger-vtypes">车辆类型（逗号或换行分隔）</Label>
                <Textarea
                  id="ledger-vtypes"
                  value={ledgerVehicleTypesText}
                  onChange={(e) => setLedgerVehicleTypesText(e.target.value)}
                  rows={4}
                  className="min-h-0 font-mono text-xs"
                  placeholder="轿车，SUV，轻型货车，重型货车"
                />
                <p className="text-xs text-slate-500">用于「新增车辆」页面中的车辆类型下拉选项。</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ledger-unatures">使用性质（逗号或换行分隔）</Label>
                <Textarea
                  id="ledger-unatures"
                  value={ledgerUsageNaturesText}
                  onChange={(e) => setLedgerUsageNaturesText(e.target.value)}
                  rows={4}
                  className="min-h-0 font-mono text-xs"
                  placeholder="非营运，营运，货运"
                />
                <p className="text-xs text-slate-500">对应行驶证“使用性质”字段下拉；车辆台账内仍可留空。</p>
              </div>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "io" ? (
          <SectionCard
            title="导入导出"
            desc="当前系统已统一限制为电子表格导入导出，便于模板管理、字段校验和批量处理。此分类主要用于说明规则与建议操作方式。"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">当前规则</p>
                <div className="mt-3 space-y-2 text-xs leading-6 text-slate-600">
                  <p>导出：仅支持电子表格（`.xlsx`）。</p>
                  <p>导入：仅支持电子表格（`.xlsx`），不再支持逗号分隔文本。</p>
                  <p>建议统一按模板列头维护数据，减少导入失败与字段错位。</p>
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-900">使用建议</p>
                <div className="mt-3 space-y-2 text-xs leading-6 text-slate-600">
                  <p>先在业务页面导出电子表格，再按导出的列结构回填数据。</p>
                  <p>避免手动改动列名；新增字段时应同步更新模板说明。</p>
                  <p>批量导入前，优先在测试数据中做一次小批量验证。</p>
                </div>
              </div>
            </div>
          </SectionCard>
        ) : null}
      </div>

      {msg ? <p className="text-xs text-primary">{msg}</p> : null}
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">当前分类仅影响页面组织方式；保存时仍会统一写入系统设置键。</p>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "保存中…" : "保存到 KV"}
        </Button>
      </div>
    </form>
  );
}
