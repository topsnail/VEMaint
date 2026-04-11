import { listVehicleLedgers } from "@/app/actions/vehicle-ledger";
import { VehicleLedgerPage } from "@/components/vehicle-ledger-page";
import { vehicleLedgerRowFromDb } from "@/lib/vehicle-ledger-dto";

export const runtime = "edge";

export default async function VehicleLedgerRoute() {
  const rows = await listVehicleLedgers();
  return <VehicleLedgerPage initial={rows.map((r) => vehicleLedgerRowFromDb(r))} />;
}
