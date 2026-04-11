"use server";

import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

export async function getDashboardOverviewAction() {
  const data = await loadDashboardDataProps();
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const overdue = data.reminders.filter((r) => !r.isNotified && r.dueDate < now.toISOString().slice(0, 10)).length;
  const monthCost = data.records
    .filter((r) => r.date.startsWith(month))
    .reduce((sum, r) => {
      const n = Number((r.cost ?? "").replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
  return {
    totalAssets: data.assets.length,
    vehicles: data.assets.filter((a) => a.type === "车辆").length,
    machines: data.assets.filter((a) => a.type === "机械").length,
    overdue,
    monthCost,
  };
}

