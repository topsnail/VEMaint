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
  <div className="ve-pending-item">
    <div className="flex w-full flex-wrap items-center gap-3">
      <StatusPill
        tone={levelTone(item.level)}
        label={item.level === "expired" ? "已逾期" : item.level === "within7" ? "7天内到期" : "30天内到期"}
      />
      <span className="ve-alert-plateNo font-medium">{item.plateNo}</span>
      <span className="ve-alert-type">{item.type}</span>
      <span className="ve-alert-owner text-slate-500">
        {item.ownerDept ?? "-"}/{item.ownerPerson ?? "-"}
      </span>
      {canHandleAlerts && (
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus("processing")}
            disabled={item.actionStatus === "processing"}
            className="ve-status-btn ve-status-processing"
          >
            标记处理中
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onUpdateStatus("resolved")}
            disabled={item.actionStatus === "resolved"}
            className="ve-status-btn ve-status-resolved"
          >
            标记已处理
          </Button>
        </div>
      )}
    </div>
  </div>
));
