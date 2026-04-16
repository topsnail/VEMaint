import { Hono } from "hono";
import { d1All } from "../db/d1";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { jsonOk } from "../lib/response";
import type { AppEnv } from "../types";

export const exportRoute = new Hono<AppEnv>();
exportRoute.use("/api/export/*", requireAuth);

exportRoute.get("/api/export/vehicles", permitPerm("export.vehicles"), async (c) => {
  const rows = await d1All<Record<string, unknown>>(c.env.DB, "select * from vehicles order by updated_at desc");
  return jsonOk(c, { rows });
});

exportRoute.get("/api/export/maintenance", permitPerm("export.maintenance"), async (c) => {
  const rows = await d1All<Record<string, unknown>>(
    c.env.DB,
    "select * from maintenance_records order by maintenance_date desc, updated_at desc",
  );
  return jsonOk(c, { rows });
});

