import { Hono } from "hono";
import { d1All } from "../db/d1";
import { alertLevel, daysBetweenToday } from "../lib/alerts";
import { jsonOk } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { getSystemConfig } from "../services/config";
import type { AppEnv } from "../types";

type VehicleCycleRow = {
  vehicleId: string;
  plateNo: string;
  brandModel: string;
  insuranceExpiry: string | null;
  annualExpiry: string | null;
  maintNextDate: string | null;
  maintNextKm: number | null;
  mileage: number;
};

export const alertsRoute = new Hono<AppEnv>();
alertsRoute.use("/api/alerts", requireAuth);

alertsRoute.get("/api/alerts", async (c) => {
  const cfg = await getSystemConfig(c.env.KV);
  const rows = await d1All<VehicleCycleRow>(
    c.env.DB,
    `
select v.id as vehicleId, v.plate_no as plateNo, v.brand_model as brandModel, v.mileage,
vc.insurance_expiry as insuranceExpiry, vc.annual_expiry as annualExpiry, vc.maint_next_date as maintNextDate, vc.maint_next_km as maintNextKm
from vehicles v left join vehicle_cycles vc on vc.vehicle_id = v.id
order by v.updated_at desc
`,
  );
  const alerts = rows.flatMap((r) => {
    const out: Array<Record<string, unknown>> = [];
    const insuranceDays = daysBetweenToday(r.insuranceExpiry);
    const annualDays = daysBetweenToday(r.annualExpiry);
    const maintDays = daysBetweenToday(r.maintNextDate);
    const maintKmLeft = typeof r.maintNextKm === "number" ? r.maintNextKm - r.mileage : null;

    const insuranceLevel = alertLevel(insuranceDays, cfg.warnDays);
    if (insuranceLevel !== "none")
      out.push({ type: "insurance", level: insuranceLevel, days: insuranceDays, vehicleId: r.vehicleId, plateNo: r.plateNo });

    const annualLevel = alertLevel(annualDays, cfg.warnDays);
    if (annualLevel !== "none")
      out.push({ type: "annual", level: annualLevel, days: annualDays, vehicleId: r.vehicleId, plateNo: r.plateNo });

    const maintDateLevel = alertLevel(maintDays, cfg.warnDays);
    if (maintDateLevel !== "none")
      out.push({
        type: "maintenance-date",
        level: maintDateLevel,
        days: maintDays,
        vehicleId: r.vehicleId,
        plateNo: r.plateNo,
      });

    if (maintKmLeft !== null && maintKmLeft <= 500) {
      out.push({
        type: "maintenance-km",
        level: maintKmLeft < 0 ? "expired" : "soon",
        kmLeft: maintKmLeft,
        vehicleId: r.vehicleId,
        plateNo: r.plateNo,
      });
    }
    return out;
  });
  return jsonOk(c, { alerts });
});

