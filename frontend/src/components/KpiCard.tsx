import { Card, Statistic } from "antd";
import React from "react";

interface KpiCardProps {
  title: string;
  value: number;
  valueStyle?: object;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = React.memo(({ title, value, valueStyle, onClick }) => (
  <Card
    size="small"
    hoverable={!!onClick}
    className="ve-kpi-card transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-card-lg"
    onClick={onClick}
  >
    <Statistic title={title} value={value} valueStyle={valueStyle} />
  </Card>
));
