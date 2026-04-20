import { Button, List, Space } from "antd";
import React from "react";

import { AlertItemType } from "./AlertItem";
import { StatusPill } from "./StatusPill";

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
  <List.Item className="ve-pending-item">
    <Space wrap size="middle" className="w-full items-center">
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
        <Space size="small" className="ml-auto">
          <Button
            size="small"
            onClick={() => onUpdateStatus("processing")}
            disabled={item.actionStatus === "processing"}
            className="ve-status-btn ve-status-processing"
          >
            标记处理中
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => onUpdateStatus("resolved")}
            disabled={item.actionStatus === "resolved"}
            className="ve-status-btn ve-status-resolved"
          >
            标记已处理
          </Button>
        </Space>
      )}
    </Space>
  </List.Item>
));
