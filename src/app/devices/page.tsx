import { Dashboard } from "@/components/dashboard";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

export default async function DevicesPage() {
  const props = await loadDashboardDataProps();
  return <Dashboard {...props} view="devices" />;
}
