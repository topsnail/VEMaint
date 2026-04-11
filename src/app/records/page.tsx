import { MaintenanceRecordsPage } from "@/components/maintenance-records-page";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

export const runtime = "edge";

export default async function RecordsPage() {
  const props = await loadDashboardDataProps();
  return (
    <MaintenanceRecordsPage
      assets={props.assets}
      records={props.records}
      maintenanceKinds={props.maintenanceKinds}
    />
  );
}

