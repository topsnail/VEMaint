"use server";

import { createDb } from "@/db";
import { faultEvents, incidents } from "@/db/schema";
import { getCloudflareEnv } from "@/lib/cf-env";
import { canWriteByRole } from "@/lib/authz";
import { getCurrentUserRole } from "@/lib/auth-session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function createIncidentFromForm(formData: FormData) {
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) return { ok: false as const, error: "只读模式禁止新增" };
  const db = createDb(DB);
  const assetId = String(formData.get("assetId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  if (!assetId || !kind || !eventDate) return { ok: false as const, error: "资产、类型、日期必填" };
  if (kind !== "violation" && kind !== "accident") return { ok: false as const, error: "类型仅支持「违章」或「事故」" };
  if (!isIsoDate(eventDate)) return { ok: false as const, error: "日期格式须为 例如 2026-01-31" };
  await db.insert(incidents).values({
    id: crypto.randomUUID(),
    assetId,
    kind,
    eventDate,
    location: String(formData.get("location") ?? "").trim() || null,
    detail: String(formData.get("detail") ?? "").trim() || null,
    penalty: String(formData.get("penalty") ?? "").trim() || null,
    status: String(formData.get("status") ?? "").trim() || null,
    claimAmount: String(formData.get("claimAmount") ?? "").trim() || null,
    repairDetail: String(formData.get("repairDetail") ?? "").trim() || null,
  });
  revalidatePath("/");
  revalidatePath("/devices", "layout");
  return { ok: true as const };
}

export async function createFaultEvent(input: {
  assetId: string;
  faultCode: string;
  symptom?: string;
  eventDate: string;
  resolvedDate?: string;
  isRework?: boolean;
}) {
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) return { ok: false as const, error: "只读模式禁止新增" };
  const db = createDb(DB);
  if (!input.assetId?.trim() || !input.faultCode?.trim() || !input.eventDate?.trim()) {
    return { ok: false as const, error: "资产、故障代码、日期必填" };
  }
  if (!isIsoDate(input.eventDate.trim())) return { ok: false as const, error: "日期格式须为 例如 2026-01-31" };
  await db.insert(faultEvents).values({
    id: crypto.randomUUID(),
    assetId: input.assetId.trim(),
    faultCode: input.faultCode.trim(),
    symptom: input.symptom?.trim() || null,
    eventDate: input.eventDate.trim(),
    resolvedDate: input.resolvedDate?.trim() || null,
    isRework: Boolean(input.isRework),
  });
  revalidatePath("/");
  revalidatePath("/devices", "layout");
  return { ok: true as const };
}

export async function listIncidentsByAsset(assetIdRaw: string) {
  const assetId = assetIdRaw?.trim();
  if (!assetId) return [];
  const { DB } = getCloudflareEnv();
  const db = createDb(DB);
  return db.select().from(incidents).where(eq(incidents.assetId, assetId));
}

export async function listFaultsByAsset(assetIdRaw: string) {
  const assetId = assetIdRaw?.trim();
  if (!assetId) return [];
  const { DB } = getCloudflareEnv();
  const db = createDb(DB);
  return db.select().from(faultEvents).where(eq(faultEvents.assetId, assetId));
}
