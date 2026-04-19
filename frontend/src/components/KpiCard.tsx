import { Card, Statistic } from "antd";
import React from "react";

interface KpiCardProps {
  title: string;
  value: number;
  valueStyle?: object;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = React.memo(({ title, value, valueStyle, onClick }) => (
  <Card size="small" hoverable={!!onClick} className="ve-kpi-card" onClick={onClick}>
    <Statistic title={title} value={value} valueStyle={valueStyle} />
  </Card>
));
