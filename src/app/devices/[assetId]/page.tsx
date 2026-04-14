import { AssetDetailView } from "@/components/asset-detail-view";
import { PageContainer } from "@/components/page-container";
import { loadDashboardDataProps } from "@/lib/load-dashboard-props";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export const runtime = "edge";

export default async function DeviceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<{ entry?: string }>;
}) {
  const { assetId } = await params;
  const sp = await searchParams;
  const entry = sp.entry === "profile" ? ("profile" as const) : ("maintenance" as const);

  const props = await loadDashboardDataProps();
  const asset = props.assets.find((a) => a.id === assetId);
  if (!asset) notFound();

  const records = props.records.filter((r) => r.assetId === assetId);
  const reminders = props.reminders.filter((r) => r.assetId === assetId);

  return (
    <PageContainer size="standard" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" className="h-8 border-slate-200 bg-white text-xs">
            <Link href="/">返回仪表盘</Link>
          </Button>
        </div>
        <AssetDetailView
          asset={asset}
          entry={entry}
          records={records}
          maintenanceKinds={props.maintenanceKinds}
          reminders={reminders}
        />
    </PageContainer>
  );
}
