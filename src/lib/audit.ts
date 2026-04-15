import { createDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { getCloudflareEnv } from "@/lib/cf-env";
import { getCurrentAuthSession } from "@/lib/auth-session";

export async function writeAuditLog(input: {
  action: string;
  target?: string | null;
  detail?: Record<string, unknown> | null;
}) {
  try {
    const env = await getCloudflareEnv();
    const session = await getCurrentAuthSession();
    const db = createDb(env.DB);
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorUserId: session?.userId ?? null,
      actorUsername: session?.username ?? null,
      actorRole: session?.role ?? null,
      action: input.action,
      target: input.target ?? null,
      detail: input.detail ?? null,
    });
  } catch {
    // audit 日志写入失败不应影响主流程
  }
}

