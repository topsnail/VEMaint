"use client";

import { createReminder } from "@/app/actions/reminders";
import { getAppSettingsAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type AssetOption = { id: string; name: string };

export function NewReminderForm({ assets }: { assets: AssetOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [taskType, setTaskType] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [repeatRule, setRepeatRule] = useState("none");
  const [taskTypePick, setTaskTypePick] = useState("");
  const [recommended, setRecommended] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getAppSettingsAction();
        if (cancelled) return;
        setRecommended(s.reminderTaskTypes ?? []);
      } catch {
        if (cancelled) return;
        setRecommended([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstId = assets[0]?.id ?? "";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const aid = assetId || firstId;
      const res = await createReminder({ assetId: aid, taskType, dueDate, repeatRule });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pb-12 md:p-8">
      <div>
        <Link href="/alerts" className="text-sm text-slate-500 hover:text-slate-900">
          ← 预警统计
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">新增预警</h1>
        <p className="mt-1 text-sm text-slate-500">为指定设备添加到期任务，用于仪表盘进度提醒。</p>
      </div>
      {assets.length === 0 ? (
        <p className="text-sm text-slate-500">请先新增至少一台设备。</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md md:p-6">
          <div className="grid gap-2">
            <Label>设备</Label>
            <Select value={assetId || firstId} onValueChange={setAssetId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nr-task">任务类型</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={taskTypePick}
                onValueChange={(v: string) => {
                  setTaskTypePick(v);
                  setTaskType(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="推荐类型（来自 KV）" />
                </SelectTrigger>
                <SelectContent>
                  {(recommended.length ? recommended : ["年审", "保险", "保养", "维修", "检修"]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="nr-task"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                required
                placeholder="也可以手动输入…"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nr-due">到期日</Label>
              <Input id="nr-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>重复</Label>
              <Select value={repeatRule} onValueChange={setRepeatRule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不重复</SelectItem>
                  <SelectItem value="monthly">每月</SelectItem>
                  <SelectItem value="quarterly">每季度</SelectItem>
                  <SelectItem value="semiannual">每半年</SelectItem>
                  <SelectItem value="yearly">每年</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
      )}
    </div>
  );
}
