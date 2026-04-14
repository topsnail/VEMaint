import { getVehicleLedgerById } from "@/app/actions/vehicle-ledger";
import { PageContainer } from "@/components/page-container";
import { VehicleLedgerDetailBlock } from "@/components/vehicle-ledger-detail-block";
import { verifyVehicleShareToken } from "@/lib/share-token";
import { vehicleLedgerRowFromDb } from "@/lib/vehicle-ledger-dto";
import { notFound } from "next/navigation";

export const runtime = "edge";

export default async function SharedVehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  const ok = token ? await verifyVehicleShareToken(token, id) : false;
  if (!ok) notFound();
  const raw = await getVehicleLedgerById(id);
  if (!raw) notFound();
  const row = vehicleLedgerRowFromDb(raw);

  return (
    <PageContainer size="standard" className="space-y-6">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">车辆信息分享</h1>
        <p className="mt-1 text-sm text-slate-500">
          {row.plateNo} · {row.brandModel}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <VehicleLedgerDetailBlock row={row} />
      </div>
    </PageContainer>
  );
}

