import { d1All, d1Run } from "../db/d1";
import type { JwtUser, OperationLog } from "../types";

type OperationLogColumns = {
  ip: boolean;
  userAgent: boolean;
  reason: boolean;
};

let cachedColumns: OperationLogColumns | null = null;

async function getOperationLogColumns(db: D1Database): Promise<OperationLogColumns> {
  if (cachedColumns) return cachedColumns;
  const cols = await d1All<{ name: string }>(db, "pragma table_info(operation_logs)");
  const names = new Set(cols.map((c) => String(c.name)));
  cachedColumns = {
    ip: names.has("ip"),
    userAgent: names.has("user_agent"),
    reason: names.has("reason"),
  };
  return cachedColumns;
}

function selectColumnsSql(columns: OperationLogColumns) {
  return [
    "id",
    "actor_user_id as actorUserId",
    "actor_username as actorUsername",
    "action",
    "target",
    "detail",
    columns.ip ? "ip" : "null as ip",
    columns.userAgent ? "user_agent as userAgent" : "null as userAgent",
    columns.reason ? "reason" : "null as reason",
    "created_at as createdAt",
  ].join(",");
}

export async function writeOperationLog(
  db: D1Database,
  actor: JwtUser | null,
  action: string,
  target: string,
  detail: Record<string, unknown> | null = null,
  meta?: { ip?: string | null; userAgent?: string | null; reason?: string | null },
) {
  const columns = await getOperationLogColumns(db);
  const insertColumns = ["id", "actor_user_id", "actor_username", "action", "target", "detail"];
  const values: unknown[] = [
    crypto.randomUUID(),
    actor?.userId ?? null,
    actor?.username ?? null,
    action,
    target,
    detail ? JSON.stringify(detail) : null,
  ];
  if (columns.ip) {
    insertColumns.push("ip");
    values.push(meta?.ip ?? null);
  }
  if (columns.userAgent) {
    insertColumns.push("user_agent");
    values.push(meta?.userAgent ?? null);
  }
  if (columns.reason) {
    insertColumns.push("reason");
    values.push(meta?.reason ?? null);
  }
  const placeholders = values.map((_, idx) => `?${idx + 1}`).join(",");
  await d1Run(
    db,
    `insert into operation_logs (${insertColumns.join(",")},created_at) values (${placeholders},datetime('now'))`,
    values,
  );
}

export async function listOperationLogs(db: D1Database, limit = 200): Promise<OperationLog[]> {
  const columns = await getOperationLogColumns(db);
  return await d1All<OperationLog>(
    db,
    `
select ${selectColumnsSql(columns)}
from operation_logs
order by created_at desc
limit ?1
`,
    [limit],
  );
}

type ListOperationLogsQuery = {
  limit: number;
  offset: number;
  actor?: string | null;
  action?: string | null;
  actionPrefix?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  riskOnly?: boolean;
};

export async function searchOperationLogs(
  db: D1Database,
  query: ListOperationLogsQuery,
): Promise<{ rows: OperationLog[]; total: number }> {
  const columns = await getOperationLogColumns(db);
  const where: string[] = [];
  const params: unknown[] = [];
  const push = (v: unknown) => {
    params.push(v);
    return `?${params.length}`;
  };

  if (query.actor) {
    const p = push(`%${query.actor.trim()}%`);
    where.push(`ifnull(actor_username,'') like ${p}`);
  }
  if (query.action) {
    const p = push(query.action.trim());
    where.push(`action = ${p}`);
  }
  if (query.actionPrefix) {
    const p = push(`${query.actionPrefix.trim()}%`);
    where.push(`action like ${p}`);
  }
  if (query.q) {
    const p = push(`%${query.q.trim()}%`);
    const qParts = [
      `ifnull(actor_username,'') like ${p}`,
      `ifnull(action,'') like ${p}`,
      `ifnull(target,'') like ${p}`,
      `ifnull(detail,'') like ${p}`,
    ];
    if (columns.reason) qParts.push(`ifnull(reason,'') like ${p}`);
    if (columns.ip) qParts.push(`ifnull(ip,'') like ${p}`);
    where.push(
      `(${qParts.join(" or ")})`,
    );
  }
  if (query.from) {
    const p = push(query.from.trim());
    where.push(`datetime(created_at) >= datetime(${p})`);
  }
  if (query.to) {
    const p = push(`${query.to.trim()} 23:59:59`);
    where.push(`datetime(created_at) <= datetime(${p})`);
  }
  if (query.riskOnly) {
    where.push(`(action like '%.delete' or action like '%.password' or action like '%.role' or action like '%.disabled' or action like 'config.%')`);
  }

  const whereSql = where.length > 0 ? `where ${where.join(" and ")}` : "";
  const totalSql = `select count(*) as total from operation_logs ${whereSql}`;
  const totalRow = await d1All<{ total: number }>(db, totalSql, params);
  const total = Number(totalRow?.[0]?.total ?? 0);

  const limitParam = push(query.limit);
  const offsetParam = push(query.offset);
  const rows = await d1All<OperationLog>(
    db,
    `
select ${selectColumnsSql(columns)}
from operation_logs
${whereSql}
order by created_at desc
limit ${limitParam} offset ${offsetParam}
`,
    params,
  );
  return { rows, total };
}

