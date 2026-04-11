import { asc, desc } from "drizzle-orm";
import { createDb } from "@/db";
import { assets, faultEvents, incidents, maintenanceRecords, reminders } from "@/db/schema";
import type { CloudflareEnv } from "../../env";

export async function loadDashboardData(env: CloudflareEnv) {
  const db = createDb(env.DB);

  const [assetRows, reminderRows, recordRows, incidentRows, faultRows] = await Promise.all([
    db.select().from(assets).orderBy(asc(assets.name)),
    db.select().from(reminders).orderBy(asc(reminders.dueDate)),
    db.select().from(maintenanceRecords).orderBy(desc(maintenanceRecords.date)),
    db.select().from(incidents).orderBy(desc(incidents.eventDate)),
    db.select().from(faultEvents).orderBy(desc(faultEvents.eventDate)),
  ]);

  return { assetRows, reminderRows, recordRows, incidentRows, faultRows };
}
