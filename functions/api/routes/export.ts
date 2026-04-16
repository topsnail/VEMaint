import { Hono } from "hono";
import { d1All } from "../db/d1";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import type { AppEnv } from "../types";

export const exportRoute = new Hono<AppEnv>();
exportRoute.use("/api/export/*", requireAuth);

function escapeCsvValue(value: unknown) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );
  const lines = [
    headers.map((header) => escapeCsvValue(header)).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

function csvResponse(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = new Headers();
  headers.set("Content-Type", "text/csv; charset=utf-8");
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "no-store");
  return new Response(buildCsv(rows), { status: 200, headers });
}

exportRoute.get("/api/export/vehicles", permitPerm("export.vehicles"), async (c) => {
  const rows = await d1All<Record<string, unknown>>(c.env.DB, "select * from vehicles order by updated_at desc");
  return csvResponse(`vehicles-${new Date().toISOString().slice(0, 10)}.csv`, rows);
});

exportRoute.get("/api/export/maintenance", permitPerm("export.maintenance"), async (c) => {
  const rows = await d1All<Record<string, unknown>>(
    c.env.DB,
    "select * from maintenance_records order by maintenance_date desc, updated_at desc",
  );
  return csvResponse(`maintenance-${new Date().toISOString().slice(0, 10)}.csv`, rows);
});

