"use server";

import { createDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { getCloudflareEnv } from "@/lib/cf-env";
import { canEditSettings } from "@/lib/authz";
import { getCurrentUserRole } from "@/lib/auth-session";
import { desc, like, or } from "drizzle-orm";

export type AuditLogRow = {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  actorRole: string | null;
  action: string;
  target: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

export async function listAuditLogsAction(input?: { q?: string; limit?: number; offset?: number }) {
  const role = await getCurrentUserRole();
  if (!canEditSettings(role)) return { ok: false as const, error: "仅管理员可查看操作日志" };

  const limit = Math.min(200, Math.max(20, Math.round(Number(input?.limit ?? 50) || 50)));
  const offset = Math.max(0, Math.round(Number(input?.offset ?? 0) || 0));
  const q = String(input?.q ?? "").trim();

  const { DB } = getCloudflareEnv();
  const db = createDb(DB);

  const where = q
    ? or(
        like(auditLogs.action, `%${q}%`),
        like(auditLogs.actorUsername, `%${q}%`),
        like(auditLogs.target, `%${q}%`),
      )
    : undefined;

  const rows = await db
    .select()
    .from(auditLogs)
    .where(where as any)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    ok: true as const,
    rows: rows as unknown as AuditLogRow[],
    limit,
    offset,
  };
}

