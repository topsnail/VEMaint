/**
 * Cloudflare Workers Cron 示例：检查已到期且未通知的 reminders。
 *
 * wrangler.toml（独立 Worker）示例：
 *
 *   name = "vehicle-reminders-cron"
 *   main = "workers/reminders-cron.ts"
 *   compatibility_date = "2024-10-22"
 *   [[d1_databases]]
 *   binding = "DB"
 *   database_name = "vehicle-maintenance-db"
 *   database_id = "<与主站相同>"
 *   [triggers]
 *   crons = ["0 8 * * *"]
 */

export interface Env {
  DB: D1Database;
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(isoDate: string, months: number) {
  const [y, m, d] = isoDate.split("-").map((n) => Number(n));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

function nextDueDate(dueDate: string, repeatRule: string) {
  switch (repeatRule) {
    case "monthly":
      return addMonths(dueDate, 1);
    case "quarterly":
      return addMonths(dueDate, 3);
    case "semiannual":
      return addMonths(dueDate, 6);
    case "yearly":
      return addMonths(dueDate, 12);
    default:
      return null;
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runReminderCheck(env));
  },
};

async function runReminderCheck(env: Env) {
  const today = todayISODate();

  const { results } = await env.DB.prepare(
    `SELECT id, asset_id AS assetId, task_type AS taskType, due_date AS dueDate, repeat_rule AS repeatRule
     FROM reminders
     WHERE due_date <= ? AND is_notified = 0`
  )
    .bind(today)
    .all<{ id: string; assetId: string; taskType: string; dueDate: string; repeatRule: string }>();

  for (const row of results ?? []) {
    // TODO: 接入邮件 / Webhook / KV 缓存防重等
    console.log(`[reminder] ${row.id} asset=${row.assetId} ${row.taskType} due=${row.dueDate}`);
    await env.DB.prepare(`UPDATE reminders SET is_notified = 1 WHERE id = ?`).bind(row.id).run();

    const next = nextDueDate(row.dueDate, row.repeatRule || "none");
    if (next) {
      const nextId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO reminders (id, asset_id, task_type, due_date, repeat_rule, is_notified, created_at)
         VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`
      )
        .bind(nextId, row.assetId, row.taskType, next, row.repeatRule || "none")
        .run();
    }
  }
}
