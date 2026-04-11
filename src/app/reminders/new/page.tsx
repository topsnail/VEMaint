import { NewReminderForm } from "@/components/new-reminder-form";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";

export const runtime = "edge";

export default async function RemindersNewPage() {
  const props = await loadDashboardDataProps();
  return <NewReminderForm assets={props.assets.map((a) => ({ id: a.id, name: a.name }))} />;
}
