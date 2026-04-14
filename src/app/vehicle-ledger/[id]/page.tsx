import { getVehicleLedgerById } from "@/app/actions/vehicle-ledger";
import { VehicleLedgerDetailBlock } from "@/components/vehicle-ledger-detail-block";
import { VehicleLedgerEditNavButton } from "@/components/vehicle-ledger-edit-button";
import { vehicleLedgerRowFromDb } from "@/lib/vehicle-ledger-dto";
import Link from "next/link";
import { notFound } from "next/navigation";

export const runtime = "edge";

export default async function VehicleLedgerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getVehicleLedgerById(id);
  if (!raw) notFound();
  const row = vehicleLedgerRowFromDb(raw);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <Link href="/vehicle-ledger" className="text-sm text-slate-500 hover:text-slate-900">
            ← 车辆台账
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">车辆详情</h1>
              <p className="mt-1 text-sm text-slate-500">
                {row.plateNo} · {row.brandModel}
              </p>
            </div>
            <VehicleLedgerEditNavButton editHref={`/vehicle-ledger/${row.id}/edit`} className="h-8">
              编辑
            </VehicleLedgerEditNavButton>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
          <VehicleLedgerDetailBlock row={row} />
        </div>
    </div>
  );
}
