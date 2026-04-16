import { Hono } from "hono";
import { d1All, d1First, d1Run } from "../db/d1";
import { alertLevel, daysBetweenToday } from "../lib/alerts";
import { jsonError, jsonOk } from "../lib/response";
import { permitPerm } from "../middleware/permit";
import { requireAuth } from "../middleware/require-auth";
import { getSystemConfig } from "../services/config";
import type { AppEnv } from "../types";

type VehicleStatusRow = {
  total: number;
  normalCount: number;
  repairingCount: number;
  stoppedCount: number;
  scrappedCount: number;
};

type MaintKpiRow = {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  monthCost: number;
};

type VehicleCycleRow = {
  vehicleId: string;
  plateNo: string;
  brandModel: string;
  ownerDept: string;
  ownerPerson: string;
  insuranceExpiry: string | null;
  annualExpiry: string | null;
  maintNextDate: string | null;
  maintNextKm: number | null;
  mileage: number;
};

type AlertActionRow = {
  alertKey: string;
  status: "open" | "processing" | "resolved";
  handler: string | null;
  note: string | null;
  updatedAt: string;
};

type TrendRow = {
  day: string;
  count: number;
  cost: number;
};

type TopVehicleRow = {
  vehicleId: string | null;
  plateNo: string | null;
  brandModel: string | null;
  recordCount: number;
  totalCost: number;
};

type TopItemRow = {
  itemDesc: string;
  recordCount: number;
  totalCost: number;
};

type CostByDeptRow = {
  ownerDept: string | null;
  monthCost: number;
};

type CostByPersonRow = {
  ownerPerson: string | null;
  monthCost: number;
};

export const dashboardRoute = new Hono<AppEnv>();
dashboardRoute.use("/api/dashboard/*", requireAuth, permitPerm("app.view"));

async function ensureAlertActionsTable(db: D1Database) {
  await d1Run(
    db,
    `
create table if not exists alert_actions (
  alert_key text primary key not null,
  status text not null check (status in ('open','processing','resolved')) default 'open',
  handler text,
  note text,
  updated_at text not null default (datetime('now'))
)
`,
  );
}

dashboardRoute.get("/api/dashboard/overview", async (c) => {
  await ensureAlertActionsTable(c.env.DB);
  const cfg = await getSystemConfig(c.env.KV);
  const [vehicleStatus, maintKpi] = await Promise.all([
    d1First<VehicleStatusRow>(
      c.env.DB,
      `
select
  count(*) as total,
  sum(case when status='normal' then 1 else 0 end) as normalCount,
  sum(case when status='repairing' then 1 else 0 end) as repairingCount,
  sum(case when status='stopped' then 1 else 0 end) as stoppedCount,
  sum(case when status='scrapped' then 1 else 0 end) as scrappedCount
from vehicles
`,
    ),
    d1First<MaintKpiRow>(
      c.env.DB,
      `
select
  sum(case when date(maintenance_date)=date('now') then 1 else 0 end) as todayCount,
  sum(case when date(maintenance_date)>=date('now','-6 day') then 1 else 0 end) as weekCount,
  sum(case when date(maintenance_date)>=date('now','start of month') then 1 else 0 end) as monthCount,
  sum(case when date(maintenance_date)>=date('now','start of month') then cost else 0 end) as monthCost
from maintenance_records
`,
    ),
  ]);

  const [cycleRows, actionRows, costByDeptRows, costByPersonRows] = await Promise.all([
    d1All<VehicleCycleRow>(
      c.env.DB,
      `
select v.id as vehicleId, v.plate_no as plateNo, v.brand_model as brandModel, v.owner_dept as ownerDept, v.owner_person as ownerPerson, v.mileage,
vc.insurance_expiry as insuranceExpiry, vc.annual_expiry as annualExpiry, vc.maint_next_date as maintNextDate, vc.maint_next_km as maintNextKm
from vehicles v left join vehicle_cycles vc on vc.vehicle_id = v.id
order by v.updated_at desc
`,
    ),
    d1All<AlertActionRow>(c.env.DB, "select alert_key as alertKey, status, handler, note, updated_at as updatedAt from alert_actions"),
    d1All<CostByDeptRow>(
      c.env.DB,
      `
select v.owner_dept as ownerDept, sum(m.cost) as monthCost
from maintenance_records m
left join vehicles v on v.id = m.vehicle_id
where m.target_type='vehicle'
  and m.vehicle_id is not null
  and date(m.maintenance_date) >= date('now','start of month')
group by v.owner_dept
`,
    ),
    d1All<CostByPersonRow>(
      c.env.DB,
      `
select v.owner_person as ownerPerson, sum(m.cost) as monthCost
from maintenance_records m
left join vehicles v on v.id = m.vehicle_id
where m.target_type='vehicle'
  and m.vehicle_id is not null
  and date(m.maintenance_date) >= date('now','start of month')
group by v.owner_person
`,
    ),
  ]);
  const actionMap = new Map(actionRows.map((x) => [x.alertKey, x]));

  const alerts = cycleRows.flatMap((r) => {
    const out: Array<Record<string, unknown>> = [];
    const insuranceDays = daysBetweenToday(r.insuranceExpiry);
    const annualDays = daysBetweenToday(r.annualExpiry);
    const maintDays = daysBetweenToday(r.maintNextDate);
    const maintKmLeft = typeof r.maintNextKm === "number" ? r.maintNextKm - r.mileage : null;
    const attachAction = (base: Record<string, unknown>, type: string) => {
      const alertKey = `${r.vehicleId}:${type}`;
      const action = actionMap.get(alertKey);
      return {
        ...base,
        alertKey,
        ownerDept: r.ownerDept,
        ownerPerson: r.ownerPerson,
        actionStatus: (action?.status ?? "open") as "open" | "processing" | "resolved",
        actionHandler: action?.handler ?? null,
        actionUpdatedAt: action?.updatedAt ?? null,
      };
    };

    const insuranceLevel = alertLevel(insuranceDays, cfg.warnDays);
    if (insuranceLevel !== "none")
      out.push(
        attachAction({ type: "保险", level: insuranceLevel, days: insuranceDays, vehicleId: r.vehicleId, plateNo: r.plateNo }, "insurance"),
      );

    const annualLevel = alertLevel(annualDays, cfg.warnDays);
    if (annualLevel !== "none")
      out.push(attachAction({ type: "年审", level: annualLevel, days: annualDays, vehicleId: r.vehicleId, plateNo: r.plateNo }, "annual"));

    const maintDateLevel = alertLevel(maintDays, cfg.warnDays);
    if (maintDateLevel !== "none")
      out.push(
        attachAction({ type: "保养日期", level: maintDateLevel, days: maintDays, vehicleId: r.vehicleId, plateNo: r.plateNo }, "maintenance-date"),
      );

    if (maintKmLeft !== null && maintKmLeft <= 500) {
      out.push({
        ...attachAction({}, "maintenance-km"),
        type: "保养里程",
        level: maintKmLeft < 0 ? "expired" : "within7",
        kmLeft: maintKmLeft,
        vehicleId: r.vehicleId,
        plateNo: r.plateNo,
      });
    }
    return out;
  });

  const alertSummary = {
    expired: alerts.filter((a) => a.level === "expired").length,
    within7: alerts.filter((a) => a.level === "within7").length,
    within30: alerts.filter((a) => a.level === "within30").length,
    total: alerts.length,
  };
  const pendingAlerts = alerts.filter((a) => a.actionStatus !== "resolved");

  const trendRows = await d1All<TrendRow>(
    c.env.DB,
    `
select date(maintenance_date) as day, count(*) as count, sum(cost) as cost
from maintenance_records
where date(maintenance_date) >= date('now','-29 day')
group by date(maintenance_date)
order by date(maintenance_date) asc
`,
  );
  const trendMap = new Map(trendRows.map((r) => [r.day, r]));
  const trends: Array<{ day: string; count: number; cost: number }> = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStr = day.toISOString().slice(0, 10);
    const row = trendMap.get(dayStr);
    trends.push({
      day: dayStr,
      count: Number(row?.count ?? 0),
      cost: Number(row?.cost ?? 0),
    });
  }

  const [topVehicles, topItems] = await Promise.all([
    d1All<TopVehicleRow>(
      c.env.DB,
      `
select m.vehicle_id as vehicleId, v.plate_no as plateNo, v.brand_model as brandModel, count(*) as recordCount, sum(m.cost) as totalCost
from maintenance_records m
left join vehicles v on v.id = m.vehicle_id
where m.target_type = 'vehicle' and m.vehicle_id is not null
group by m.vehicle_id, v.plate_no, v.brand_model
order by totalCost desc
limit 5
`,
    ),
    d1All<TopItemRow>(
      c.env.DB,
      `
select item_desc as itemDesc, count(*) as recordCount, sum(cost) as totalCost
from maintenance_records
group by item_desc
order by recordCount desc, totalCost desc
limit 5
`,
    ),
  ]);

  const deptCostMap = new Map(costByDeptRows.map((x) => [x.ownerDept ?? "-", Number(x.monthCost ?? 0)]));
  const personCostMap = new Map(costByPersonRows.map((x) => [x.ownerPerson ?? "-", Number(x.monthCost ?? 0)]));
  const deptMap = new Map<string, { ownerDept: string; expired: number; within7: number; within30: number; pending: number; monthCost: number }>();
  const personMap = new Map<string, { ownerPerson: string; expired: number; within7: number; within30: number; pending: number; monthCost: number }>();
  for (const a of alerts as Array<any>) {
    const dept = String(a.ownerDept ?? "-");
    const person = String(a.ownerPerson ?? "-");
    if (!deptMap.has(dept)) deptMap.set(dept, { ownerDept: dept, expired: 0, within7: 0, within30: 0, pending: 0, monthCost: deptCostMap.get(dept) ?? 0 });
    if (!personMap.has(person))
      personMap.set(person, { ownerPerson: person, expired: 0, within7: 0, within30: 0, pending: 0, monthCost: personCostMap.get(person) ?? 0 });
    const apply = (obj: { expired: number; within7: number; within30: number; pending: number }) => {
      if (a.level === "expired") obj.expired += 1;
      if (a.level === "within7") obj.within7 += 1;
      if (a.level === "within30") obj.within30 += 1;
      if (a.actionStatus !== "resolved") obj.pending += 1;
    };
    apply(deptMap.get(dept)!);
    apply(personMap.get(person)!);
  }
  const responsibility = {
    byDept: Array.from(deptMap.values()).sort((a, b) => b.pending - a.pending || b.expired - a.expired).slice(0, 8),
    byPerson: Array.from(personMap.values()).sort((a, b) => b.pending - a.pending || b.expired - a.expired).slice(0, 8),
  };

  return jsonOk(c, {
    snapshotAt: new Date().toISOString(),
    kpis: {
      vehicles: {
        total: Number(vehicleStatus?.total ?? 0),
        normal: Number(vehicleStatus?.normalCount ?? 0),
        repairing: Number(vehicleStatus?.repairingCount ?? 0),
        stopped: Number(vehicleStatus?.stoppedCount ?? 0),
        scrapped: Number(vehicleStatus?.scrappedCount ?? 0),
      },
      maintenance: {
        todayCount: Number(maintKpi?.todayCount ?? 0),
        weekCount: Number(maintKpi?.weekCount ?? 0),
        monthCount: Number(maintKpi?.monthCount ?? 0),
        monthCost: Number(maintKpi?.monthCost ?? 0),
      },
      alerts: alertSummary,
    },
    alerts,
    pendingAlerts: pendingAlerts.slice(0, 20),
    trends,
    responsibility,
    rankings: {
      topCostVehicles: topVehicles.map((r) => ({
        vehicleId: r.vehicleId,
        plateNo: r.plateNo ?? "-",
        brandModel: r.brandModel ?? "-",
        recordCount: Number(r.recordCount ?? 0),
        totalCost: Number(r.totalCost ?? 0),
      })),
      topItems: topItems.map((r) => ({
        itemDesc: r.itemDesc,
        recordCount: Number(r.recordCount ?? 0),
        totalCost: Number(r.totalCost ?? 0),
      })),
    },
  });
});

dashboardRoute.put("/api/dashboard/alerts/:key/action", permitPerm("maintenance.edit"), async (c) => {
  await ensureAlertActionsTable(c.env.DB);
  const key = decodeURIComponent(c.req.param("key") ?? "").trim();
  const body = await c.req.json().catch(() => null as unknown);
  const status = String((body as any)?.status ?? "").trim();
  const note = String((body as any)?.note ?? "").trim() || null;
  if (!key) return jsonError(c, "BAD_REQUEST", "无效告警Key", 400);
  if (!["open", "processing", "resolved"].includes(status)) return jsonError(c, "BAD_REQUEST", "无效状态", 400);
  await d1Run(
    c.env.DB,
    `
insert into alert_actions (alert_key, status, handler, note, updated_at)
values (?1, ?2, ?3, ?4, datetime('now'))
on conflict(alert_key) do update set
  status=excluded.status,
  handler=excluded.handler,
  note=excluded.note,
  updated_at=datetime('now')
`,
    [key, status, c.get("auth").username, note],
  );
  return jsonOk(c, { ok: true });
});
