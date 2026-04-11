import { NewAssetForm } from "@/components/new-asset-form";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

export const runtime = "edge";

export default async function DevicesNewPage() {
  const props = await loadDashboardDataProps();
  return <NewAssetForm templates={props.assets} />;
}
