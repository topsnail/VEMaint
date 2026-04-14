"use server";

import { createDb } from "@/db";
import { reminders } from "@/db/schema";
import { getCloudflareEnv } from "@/lib/cf-env";
import { canDeleteByRole, canWriteByRole } from "@/lib/authz";
import { getCurrentUserRole } from "@/lib/auth-session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type CreateReminderInput = {
  assetId: string;
  taskType: string;
  dueDate: string;
  repeatRule?: string;
};

export async function createReminder(input: CreateReminderInput) {
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止新增预警" };
  }
  const db = createDb(DB);

  const assetId = input.assetId?.trim();
  const taskType = input.taskType?.trim();
  const dueDate = input.dueDate?.trim();

  if (!assetId || !taskType || !dueDate) {
    return { ok: false as const, error: "设备、任务类型与到期日必填" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { ok: false as const, error: "到期日格式须为 例如 2026-01-31" };
  }

  const repeatRule = (input.repeatRule ?? "none").trim() || "none";
  const allowed = new Set(["none", "monthly", "quarterly", "semiannual", "yearly"]);
  if (!allowed.has(repeatRule)) {
    return { ok: false as const, error: "无效重复规则" };
  }

  const id = crypto.randomUUID();
  await db.insert(reminders).values({
    id,
    assetId,
    taskType,
    dueDate,
    repeatRule,
    isNotified: false,
  });

  revalidatePath("/");
  revalidatePath("/devices", "layout");
  revalidatePath("/reminders", "layout");
  return { ok: true as const, id };
}

export async function markReminderDone(reminderId: string) {
  const id = reminderId?.trim();
  if (!id) return { ok: false as const, error: "无效 ID" };

  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止操作" };
  }
  const db = createDb(DB);
  await db.update(reminders).set({ isNotified: true }).where(eq(reminders.id, id));
  revalidatePath("/");
  revalidatePath("/devices", "layout");
  revalidatePath("/reminders", "layout");
  return { ok: true as const };
}

export async function deleteReminder(reminderId: string) {
  const id = reminderId?.trim();
  if (!id) return { ok: false as const, error: "无效 ID" };

  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canDeleteByRole(role)) {
    return { ok: false as const, error: "仅管理员可删除预警" };
  }
  const db = createDb(DB);
  await db.delete(reminders).where(eq(reminders.id, id));
  revalidatePath("/");
  revalidatePath("/devices", "layout");
  revalidatePath("/reminders", "layout");
  return { ok: true as const };
}

export async function postponeReminderDays(reminderId: string, days = 7) {
  const id = reminderId?.trim();
  if (!id) return { ok: false as const, error: "无效 ID" };
  const d = Number(days);
  const safeDays = Number.isFinite(d) && d > 0 ? Math.min(90, Math.round(d)) : 7;

  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止操作" };
  }
  const db = createDb(DB);
  const row = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  const current = row[0];
  if (!current) return { ok: false as const, error: "记录不存在" };
  const base = new Date(`${current.dueDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return { ok: false as const, error: "日期异常" };
  base.setDate(base.getDate() + safeDays);
  const nextDue = base.toISOString().slice(0, 10);

  await db.update(reminders).set({ dueDate: nextDue }).where(eq(reminders.id, id));
  revalidatePath("/");
  revalidatePath("/devices", "layout");
  revalidatePath("/reminders", "layout");
  return { ok: true as const, dueDate: nextDue };
}

export async function escalateReminder(reminderId: string) {
  const id = reminderId?.trim();
  if (!id) return { ok: false as const, error: "无效 ID" };
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止操作" };
  }
  const db = createDb(DB);
  await db.update(reminders).set({ isEscalated: true, severity: "critical" }).where(eq(reminders.id, id));
  revalidatePath("/");
  revalidatePath("/devices", "layout");
  revalidatePath("/reminders", "layout");
  return { ok: true as const };
}
