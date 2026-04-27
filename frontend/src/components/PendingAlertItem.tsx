import React from "react";

import { AlertItemType } from "./AlertItem";
import { StatusPill } from "./StatusPill";
import { Select } from "@/components/ui/legacy";

interface PendingAlertItemProps {
  item: AlertItemType & { ownerDept?: string; ownerPerson?: string };
  canHandleAlerts: boolean;
  onUpdateStatus: (status: "open" | "processing" | "resolved") => void;
}

const levelTone = (level: string): "danger" | "warning" => {
  if (level === "expired") return "danger";
  return "warning";
};

export const PendingAlertItem: React.FC<PendingAlertItemProps> = React.memo(({ item, canHandleAlerts, onUpdateStatus }) => (
  <div className="border-b border-slate-100 px-2.5 py-1 transition-colors last:border-b-0 hover:bg-slate-50">
    <div className="flex min-h-8 w-full items-center gap-1.5">
      <StatusPill
        tone={levelTone(item.level)}
        label={item.level === "expired" ? "已逾期" : item.level === "within7" ? "7天内" : "30天内"}
      />
      <span className="font-medium text-slate-900">{item.plateNo}</span>
      <span className="truncate text-xs text-slate-500">{item.type}</span>
      <span className="truncate text-xs text-slate-500">
        {item.ownerDept ?? "-"}/{item.ownerPerson ?? "-"}
      </span>
      {canHandleAlerts && (
        <div className="ml-auto">
          <Select
            size="small"
            className="h-6 w-auto min-w-[84px] text-xs"
            value={item.actionStatus === "processing" ? "processing" : item.actionStatus === "resolved" ? "resolved" : "open"}
            options={[
              { value: "open", label: (item as any).actionStatusLabels?.[0] ?? "待处理" },
              { value: "processing", label: (item as any).actionStatusLabels?.[1] ?? "处理中" },
              { value: "resolved", label: (item as any).actionStatusLabels?.[2] ?? "已处理" },
            ]}
            onChange={(v) => onUpdateStatus(v)}
          />
        </div>
      )}
    </div>
  </div>
));
