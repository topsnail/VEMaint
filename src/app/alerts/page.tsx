import { Dashboard } from "@/components/dashboard";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

export const runtime = "edge";

export default async function AlertsPage() {
  const props = await loadDashboardDataProps();
  return <Dashboard {...props} view="alerts" />;
}
