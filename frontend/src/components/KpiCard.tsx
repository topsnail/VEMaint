import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: number;
  valueStyle?: React.CSSProperties;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = React.memo(({ title, value, valueStyle, onClick }) => (
  <Card
    className={[
      "h-full rounded-[6px] border border-slate-200 bg-white shadow-sm shadow-slate-900/5",
      "transition-colors hover:bg-slate-50",
      onClick ? "cursor-pointer" : "",
    ].join(" ")}
    onClick={onClick}
  >
    <CardContent className="px-3 py-2">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <div className="mt-1 tabular-nums text-2xl font-semibold text-slate-900" style={valueStyle}>
        {value}
      </div>
    </CardContent>
  </Card>
));
