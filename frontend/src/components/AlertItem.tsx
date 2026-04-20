import React from "react";
import { StatusPill } from "./StatusPill";
import { Button } from "@/components/ui/button";

export interface AlertItemType {
  alertKey: string;
  plateNo: string;
  type: string;
  level: string;
  actionStatus?: string;
  days?: number;
  kmLeft?: number;
}

interface AlertItemProps {
  item: AlertItemType;
  onAction: () => void;
}

const levelTone = (level: string): "danger" | "warning" => {
  if (level === "expired") return "danger";
  return "warning";
};

const statusTone = (actionStatus: string | undefined): "success" | "info" | "neutral" => {
  if (actionStatus === "resolved") return "success";
  if (actionStatus === "processing") return "info";
  return "neutral";
};

export const AlertItem: React.FC<AlertItemProps> = React.memo(({ item, onAction }) => (
  <div className="ve-alert-item">
    <div className="flex w-full flex-wrap items-center gap-3">
      <StatusPill
        tone={levelTone(item.level)}
        label={item.level === "expired" ? "已逾期" : item.level === "within7" ? "7天内到期" : "30天内到期"}
      />
      <span className="ve-alert-plateNo font-medium">{item.plateNo}</span>
      <span className="ve-alert-type">{item.type}</span>
      {typeof item.days === "number" && <span className="ve-alert-days">{item.days} 天</span>}
      {typeof item.kmLeft === "number" && <span className="ve-alert-km">{item.kmLeft} km</span>}
      <StatusPill
        tone={statusTone(item.actionStatus)}
        label={
          item.actionStatus === "resolved" ? "已处理" : item.actionStatus === "processing" ? "处理中" : "未处理"
        }
      />
      <Button variant="ghost" size="sm" onClick={onAction} className="ve-alert-action h-8 px-2">
        处理
      </Button>
    </div>
  </div>
));
