import { getVehicleLedgerById } from "@/app/actions/vehicle-ledger";
import { VehicleLedgerForm } from "@/components/vehicle-ledger-form";
import { loadAppSettings } from "@/lib/app-settings";
import { getCloudflareEnv } from "@/lib/cf-env";
import { vehicleLedgerRowFromDb } from "@/lib/vehicle-ledger-dto";
import { notFound } from "next/navigation";

export const runtime = "edge";

export default async function VehicleLedgerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getVehicleLedgerById(id);
  if (!raw) notFound();
  const row = vehicleLedgerRowFromDb(raw);
  const env = getCloudflareEnv();
  const settings = await loadAppSettings(env.KV);
  const { id: _rowId, ...initialForm } = row;
  return (
    <VehicleLedgerForm
      mode="edit"
      vehicleId={row.id}
      initialForm={initialForm}
      ledgerVehicleTypes={settings.ledgerVehicleTypes}
      ledgerUsageNatures={settings.ledgerUsageNatures}
    />
  );
}
