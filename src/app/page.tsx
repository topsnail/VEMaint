import { Dashboard } from "@/components/dashboard";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

export default async function HomePage() {
  const props = await loadDashboardDataProps();
  return <Dashboard {...props} view="full" />;
}
