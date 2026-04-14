import { listVehicleLedgerDepartmentsAction, queryVehicleLedgersAction } from "@/app/actions/vehicle-ledger";
import { VehicleLedgerPage } from "@/components/vehicle-ledger-page";
import { vehicleLedgerRowFromDb } from "@/lib/vehicle-ledger-dto";
import { hasCurrentUserPermission } from "@/lib/auth-session";

export const runtime = "edge";

export default async function VehicleLedgerRoute() {
  const canWrite = await hasCurrentUserPermission("ledger.write");
  const canDelete = await hasCurrentUserPermission("ledger.delete");
  const departments = await listVehicleLedgerDepartmentsAction();
  const initial = await queryVehicleLedgersAction({ page: 1, pageSize: 24 });
  if (!initial.ok) {
    return (
      <VehicleLedgerPage
        initialRows={[]}
        initialTotal={0}
        deptOptions={departments.ok ? departments.options : []}
        canWrite={canWrite}
        canDelete={canDelete}
        initialError={initial.error}
      />
    );
  }
  return (
    <VehicleLedgerPage
      initialRows={initial.rows.map((r) => vehicleLedgerRowFromDb(r))}
      initialTotal={initial.total}
      deptOptions={departments.ok ? departments.options : []}
      canWrite={canWrite}
      canDelete={canDelete}
    />
  );
}
