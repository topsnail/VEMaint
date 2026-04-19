import { Button, List, Space, Tag } from "antd";
import React from "react";

import { AlertItemType } from "./AlertItem";

interface PendingAlertItemProps {
  item: AlertItemType & { ownerDept?: string; ownerPerson?: string };
  canHandleAlerts: boolean;
  onUpdateStatus: (status: "open" | "processing" | "resolved") => void;
}

export const PendingAlertItem: React.FC<PendingAlertItemProps> = React.memo(({ item, canHandleAlerts, onUpdateStatus }) => (
  <List.Item className="ve-pending-item">
    <Space wrap size="middle" className="w-full items-center">
      <Tag 
        color={item.level === "expired" ? "red" : item.level === "within7" ? "orange" : "gold"}
        className="ve-alert-tag"
      >
        {item.level === "expired" ? "已逾期" : item.level === "within7" ? "7天内到期" : "30天内到期"}
      </Tag>
      <span className="ve-alert-plateNo font-medium">{item.plateNo}</span>
      <span className="ve-alert-type">{item.type}</span>
      <span className="ve-alert-owner text-slate-500">{item.ownerDept ?? "-"}/{item.ownerPerson ?? "-"}</span>
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
