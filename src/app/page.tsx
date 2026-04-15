import { Dashboard } from "@/components/dashboard";
import { DashboardLoadError } from "@/components/dashboard-load-error";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

/** Cloudflare 上由 Worker 运行时读 D1，构建阶段不应预渲染仪表盘 */
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
