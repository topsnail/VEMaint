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
  <div className="border-b border-slate-100 px-3 py-1.5 transition-colors last:border-b-0 hover:bg-slate-50">
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <StatusPill
        tone={levelTone(item.level)}
        label={item.level === "expired" ? "已逾期" : item.level === "within7" ? "7天内到期" : "30天内到期"}
      />
      <span className="font-medium text-slate-900">{item.plateNo}</span>
      <span className="text-sm text-slate-500">{item.type}</span>
      {typeof item.days === "number" && (
        <span className="rounded-[6px] bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {item.days} 天
        </span>
      )}
      {typeof item.kmLeft === "number" && (
        <span className="rounded-[6px] bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {item.kmLeft} km
        </span>
      )}
      <StatusPill
        tone={statusTone(item.actionStatus)}
        label={
          item.actionStatus === "resolved" ? "已处理" : item.actionStatus === "processing" ? "处理中" : "未处理"
        }
      />
      <div className="ml-auto">
        <Button variant="ghost" size="sm" onClick={onAction} className="h-6 px-2 text-blue-700 hover:bg-blue-50 hover:text-blue-800">
        处理
        </Button>
      </div>
    </div>
  </div>
));
