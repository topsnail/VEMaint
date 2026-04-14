import type { VehicleLedgerInput } from "@/app/actions/vehicle-ledger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { zebraTableRowClass } from "@/lib/table-ui";
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
    <div className="mt-2 max-h-[min(70vh,640px)] overflow-auto rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader className="sticky top-0 z-[1] border-b border-border bg-muted [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
          <TableRow>
            <TableHead className="min-w-[7rem] text-slate-700">项目</TableHead>
            <TableHead className="text-slate-700">内容</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {VEHICLE_DETAIL_LINES.map((line, i) => (
            <TableRow key={line.label} className={zebraTableRowClass(i)}>
              <TableCell className="align-top text-sm font-medium text-slate-700">{line.label}</TableCell>
              <TableCell className="break-words text-sm text-slate-900">
                {line.keys.length === 1 && line.keys[0] === "overallDimensions"
                  ? formatOverallDimensionsForDetail(viewing.overallDimensions)
                  : detailValue(viewing, line.keys, line.separator ?? " / ", line.fallback ?? "—")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
