import { VehicleLedgerForm } from "@/components/vehicle-ledger-form";
import { loadAppSettings } from "@/lib/app-settings";
import { getCloudflareEnv } from "@/lib/cf-env";
import { VEHICLE_LEDGER_EMPTY } from "@/lib/vehicle-ledger";

export default async function VehicleLedgerNewPage() {
  const env = await getCloudflareEnv();
  const settings = await loadAppSettings(env.KV);
  const initialForm = {
    ...VEHICLE_LEDGER_EMPTY,
    vehicleType: settings.ledgerVehicleTypes[0] ?? VEHICLE_LEDGER_EMPTY.vehicleType,
  };
  return (
    <VehicleLedgerForm
      mode="create"
      initialForm={initialForm}
      ledgerVehicleTypes={settings.ledgerVehicleTypes}
      ledgerUsageNatures={settings.ledgerUsageNatures}
    />
  );
}
