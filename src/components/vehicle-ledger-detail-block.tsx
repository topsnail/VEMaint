import type { VehicleLedgerInput } from "@/app/actions/vehicle-ledger";
import { formatOverallDimensionsForDetail, VEHICLE_DETAIL_LINES } from "@/lib/vehicle-ledger";
import type { VehicleLedgerRow } from "@/lib/vehicle-ledger-dto";

function detailValue(row: VehicleLedgerInput, keys: (keyof VehicleLedgerInput)[], separator = " / ", fallback = "—") {
  const values = keys.map((k) => String(row[k] ?? "").trim());
  if (values.every((v) => !v)) return fallback;
  return values.map((v) => (v || "—")).join(separator);
}

export function VehicleLedgerDetailBlock({ row }: { row: VehicleLedgerRow }) {
  const viewing = row;
  return (
    <div className="mt-6 grid gap-2 text-sm text-slate-700">
      {VEHICLE_DETAIL_LINES.map((line) => (
        <p key={line.label}>
          {line.label}：
          {line.keys.length === 1 && line.keys[0] === "overallDimensions"
            ? formatOverallDimensionsForDetail(viewing.overallDimensions)
            : detailValue(viewing, line.keys, line.separator ?? " / ", line.fallback ?? "—")}
        </p>
      ))}
    </div>
  );
}
