import { Button, List, Space, Tag } from "antd";
import React from "react";

export interface AlertItemType {
  alertKey: string;
  plateNo: string;
  type: string;
  level: string;
  actionStatus: string;
  days?: number;
  kmLeft?: number;
}

interface AlertItemProps {
  item: AlertItemType;
  onAction: () => void;
}

export const AlertItem: React.FC<AlertItemProps> = React.memo(({ item, onAction }) => (
  <List.Item className="ve-alert-item">
    <Space size="middle" className="w-full">
      <Tag 
        color={item.level === "expired" ? "red" : item.level === "within7" ? "orange" : "gold"}
        className="ve-alert-tag"
      >
        {item.level === "expired" ? "已逾期" : item.level === "within7" ? "7天内到期" : "30天内到期"}
      </Tag>
      <span className="ve-alert-plateNo font-medium">{item.plateNo}</span>
      <span className="ve-alert-type">{item.type}</span>
      {typeof item.days === "number" && <span className="ve-alert-days">{item.days} 天</span>}
      {typeof item.kmLeft === "number" && <span className="ve-alert-km">{item.kmLeft} km</span>}
      <Tag 
        color={item.actionStatus === "resolved" ? "green" : item.actionStatus === "processing" ? "blue" : "default"}
        className="ve-alert-status"
      >
        {item.actionStatus === "resolved" ? "已处理" : item.actionStatus === "processing" ? "处理中" : "未处理"}
      </Tag>
      <Button 
        size="small" 
        type="link" 
        onClick={onAction}
        className="ve-alert-action"
      >
        处理
      </Button>
    </Space>
  </List.Item>
));
