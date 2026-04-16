import { d1All, d1Run } from "../db/d1";
import type { JwtUser, OperationLog } from "../types";

export async function writeOperationLog(
  db: D1Database,
  actor: JwtUser | null,
  action: string,
  target: string,
  detail: Record<string, unknown> | null = null,
) {
  await d1Run(
    db,
    "insert into operation_logs (id,actor_user_id,actor_username,action,target,detail,created_at) values (?1,?2,?3,?4,?5,?6,datetime('now'))",
    [crypto.randomUUID(), actor?.userId ?? null, actor?.username ?? null, action, target, detail ? JSON.stringify(detail) : null],
  );
}

export async function listOperationLogs(db: D1Database, limit = 200): Promise<OperationLog[]> {
  return await d1All<OperationLog>(
    db,
    `
select id,actor_user_id as actorUserId,actor_username as actorUsername,action,target,detail,created_at as createdAt
from operation_logs
order by created_at desc
limit ?1
`,
    [limit],
  );
}

