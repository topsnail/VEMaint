import { Dashboard } from "@/components/dashboard";
import { DashboardLoadError } from "@/components/dashboard-load-error";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const props = await loadDashboardDataProps();
    return <Dashboard {...props} view="full" />;
  } catch (e) {
    console.error("[HomePage] loadDashboardDataProps 失败", e);
    return <DashboardLoadError />;
  }
}
