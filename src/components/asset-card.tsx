"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssetRow } from "@/components/dashboard";
import type { ReminderLite } from "@/lib/reminder-utils";
import { urgencyPercent } from "@/lib/reminder-utils";
import { Progress } from "@/components/ui/progress";

type AssetCardProps = {
  asset: AssetRow;
  nextReminder: ReminderLite | null;
  lastMaintenance?: { type: string; date: string; project?: string | null; projectChild?: string | null } | null;
  icon: ReactNode;
  reminderWindowDays: number;
};

export function AssetCard({
  asset,
  nextReminder,
  lastMaintenance,
  icon,
  reminderWindowDays,
}: AssetCardProps) {
  const router = useRouter();
  const base = `/devices/${asset.id}`;
  const pct = nextReminder ? urgencyPercent(nextReminder.dueDate, reminderWindowDays) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(base)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(base);
        }
      }}
      className="text-left transition hover:opacity-95"
    >
      <Card className="h-full border-slate-200/80 transition hover:border-slate-300/90">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-slate-800">
              {icon}
            </span>
            <div>
              <CardTitle className="text-base font-medium">{asset.name}</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                {asset.type} · {asset.identifier}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
            {asset.status}
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {lastMaintenance ? (
            <p className="text-xs text-slate-500">
              最近维保：{lastMaintenance.type}（{lastMaintenance.date}）
              {lastMaintenance.project ? (
                <span className="ml-1 text-slate-400">
                  · {lastMaintenance.project}
                  {lastMaintenance.projectChild ? `/${lastMaintenance.projectChild}` : ""}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-slate-400">暂无维保记录</p>
          )}
          {nextReminder ? (
            <>
              <p className="text-xs text-slate-500">
                下一项：{nextReminder.taskType}（{nextReminder.dueDate}）
              </p>
              <Progress value={pct} />
            </>
          ) : (
            <p className="text-xs text-slate-400">暂无排期预警</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`${base}?entry=profile`);
              }}
            >
              基本情况
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`${base}?entry=maintenance`);
              }}
            >
              维保记录
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
