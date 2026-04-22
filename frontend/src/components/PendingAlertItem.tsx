import React from "react";

import { AlertItemType } from "./AlertItem";
import { StatusPill } from "./StatusPill";
import { Button } from "@/components/ui/button";

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
  <div className="border-b border-slate-100 px-3 py-1.5 transition-colors last:border-b-0 hover:bg-slate-50">
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <StatusPill
        tone={levelTone(item.level)}
        label={item.level === "expired" ? "已逾期" : item.level === "within7" ? "7天内到期" : "30天内到期"}
      />
      <span className="font-medium text-slate-900">{item.plateNo}</span>
      <span className="text-sm text-slate-500">{item.type}</span>
      <span className="text-xs text-slate-500">
        {item.ownerDept ?? "-"}/{item.ownerPerson ?? "-"}
      </span>
      {canHandleAlerts && (
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus("processing")}
            disabled={item.actionStatus === "processing"}
            className="h-6 rounded-[6px] border-blue-200 px-2 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            标记处理中
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onUpdateStatus("resolved")}
            disabled={item.actionStatus === "resolved"}
            className="h-6 rounded-[6px] px-2 text-xs disabled:opacity-60"
          >
            标记已处理
          </Button>
        </div>
      )}
    </div>
  </div>
));
