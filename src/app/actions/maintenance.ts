"use server";

import { and, eq } from "drizzle-orm";
import { createDb } from "@/db";
import { assets, maintenanceRecords } from "@/db/schema";
import { loadAppSettings } from "@/lib/app-settings";
import { canDeleteByRole, canWriteByRole } from "@/lib/authz";
import { getCurrentUserRole } from "@/lib/auth-session";
import { getCloudflareEnv } from "@/lib/cf-env";
import { DEFAULT_MAINTENANCE_KINDS } from "@/lib/kv-settings";
import { revalidatePath } from "next/cache";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function safeFileSegment(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._\u4e00-\u9fff-]/g, "_").slice(0, 120);
}

async function allowedKinds(): Promise<string[]> {
  const { KV } = getCloudflareEnv();
  const s = await loadAppSettings(KV);
  return s.maintenanceKinds.length ? s.maintenanceKinds : [...DEFAULT_MAINTENANCE_KINDS];
}

function addOneYear(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function parseNumberLike(raw: string) {
  const n = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function parsePartsJson(raw: string): { name: string; cost?: string; qty?: string; code?: string }[] | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const v = JSON.parse(t) as unknown;
    if (!Array.isArray(v)) return null;
    return v
      .filter((x) => x && typeof x === "object")
      .map((x) => x as Record<string, unknown>)
      .map((x) => ({
        name: String(x.name ?? "").trim(),
        cost: String(x.cost ?? "").trim() || undefined,
        qty: String(x.qty ?? "").trim() || undefined,
        code: String(x.code ?? "").trim() || undefined,
      }))
      .filter((x) => x.name);
  } catch {
    return null;
  }
}

export async function createMaintenanceRecordFromForm(formData: FormData) {
  const { DB, R2 } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止新增记录" };
  }
  const db = createDb(DB);

  const assetId = String(formData.get("assetId") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  const project = String(formData.get("project") ?? "").trim();
  const projectChild = String(formData.get("projectChild") ?? "").trim();
  const cost = String(formData.get("cost") ?? "").trim();
  const operator = String(formData.get("operator") ?? "").trim();
  const assignee = String(formData.get("assignee") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim();
  const nextPlanDate = String(formData.get("nextPlanDate") ?? "").trim();
  const nextPlanValue = String(formData.get("nextPlanValue") ?? "").trim();
  const partsJsonRaw = String(formData.get("partsJson") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const file = formData.get("file");

  if (!assetId || !date) {
    return { ok: false as const, error: "设备与日期必填" };
  }
  if (!isIsoDate(date)) {
    return { ok: false as const, error: "日期格式须为 例如 2026-01-31" };
  }

  const kinds = await allowedKinds();
  if (!kinds.includes(type)) {
    return { ok: false as const, error: "无效维保类型" };
  }

  const partsJson = parsePartsJson(partsJsonRaw);
  if (partsJsonRaw && !partsJson) {
    return { ok: false as const, error: "零件明细结构化格式不正确" };
  }

  let r2Key: string | null = null;
  let fileSize: number | null = null;
  let fileType: string | null = null;
  if (file instanceof File && file.size > 0) {
    fileSize = file.size;
    fileType = file.type || null;
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false as const, error: "附件超过 10MB 上限" };
    }
    const segment = safeFileSegment(file.name);
    const key = `maintenance/${assetId}/${crypto.randomUUID()}-${segment}`;
    await R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    r2Key = key;
  }

  const id = crypto.randomUUID();
  await db.insert(maintenanceRecords).values({
    id,
    assetId,
    type,
    date,
    value: value || null,
    project: project || null,
    projectChild: projectChild || null,
    cost: cost || null,
    operator: operator || null,
    assignee: assignee || null,
    vendor: vendor || null,
    description: description || null,
    nextPlanDate: nextPlanDate || null,
    nextPlanValue: nextPlanValue || null,
    partsJson: partsJson ? JSON.stringify(partsJson) : null,
    r2Key,
  });

  const baseUpdate: Partial<typeof assets.$inferInsert> = {
    lastMaintenanceDate: date,
  };
  const num = parseNumberLike(value);
  const assetRow = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  const asset = assetRow[0];
  if (num !== null && asset?.type === "车辆") baseUpdate.currentMileage = String(Math.round(num));
  if (num !== null && asset?.type === "机械") baseUpdate.currentHours = String(Math.round(num));
  if (/保养/.test(type) && num !== null) {
    baseUpdate.nextMaintenanceMileage = String(Math.round(num + 5000));
  }
  if (/续保|保险/.test(type)) {
    const next = addOneYear(date);
    if (next) baseUpdate.insuranceExpiry = next;
  }
  if (/年审/.test(type)) {
    const next = addOneYear(date);
    if (next) baseUpdate.inspectionExpiry = next;
  }
  await db.update(assets).set(baseUpdate).where(eq(assets.id, assetId));

  revalidatePath("/");
  revalidatePath("/devices", "layout");
  revalidatePath("/records");
  return { ok: true as const, id, r2Key, fileSize, fileType };
}

export type UpdateMaintenanceInput = {
  id: string;
  assetId: string;
  type: string;
  date: string;
  value?: string;
  project?: string;
  projectChild?: string;
  cost?: string;
  operator?: string;
  assignee?: string;
  vendor?: string;
  description?: string;
  nextPlanDate?: string;
  nextPlanValue?: string;
  partsJson?: string;
};

export async function updateMaintenanceRecord(input: UpdateMaintenanceInput) {
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止编辑记录" };
  }
  const db = createDb(DB);

  const id = input.id?.trim();
  const assetId = input.assetId?.trim();
  const type = input.type?.trim();
  const date = input.date?.trim();
  if (!id || !assetId || !type || !date) return { ok: false as const, error: "字段不完整" };
  if (!isIsoDate(date)) return { ok: false as const, error: "日期格式须为 例如 2026-01-31" };
  const parsedParts = parsePartsJson(input.partsJson ?? "");
  if ((input.partsJson ?? "").trim() && !parsedParts) {
    return { ok: false as const, error: "零件明细结构化格式不正确" };
  }

  await db
    .update(maintenanceRecords)
    .set({
      type,
      date,
      value: input.value?.trim() || null,
      project: input.project?.trim() || null,
      projectChild: input.projectChild?.trim() || null,
      cost: input.cost?.trim() || null,
      operator: input.operator?.trim() || null,
      assignee: input.assignee?.trim() || null,
      vendor: input.vendor?.trim() || null,
      description: input.description?.trim() || null,
      nextPlanDate: input.nextPlanDate?.trim() || null,
      nextPlanValue: input.nextPlanValue?.trim() || null,
      partsJson: parsedParts ? JSON.stringify(parsedParts) : null,
    })
    .where(and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.assetId, assetId)));

  revalidatePath("/");
  revalidatePath("/devices", "layout");
  revalidatePath("/records");
  return { ok: true as const };
}

export async function deleteMaintenanceRecord(idRaw: string, assetIdRaw: string) {
  const id = idRaw?.trim();
  const assetId = assetIdRaw?.trim();
  if (!id || !assetId) return { ok: false as const, error: "无效编号" };

  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canDeleteByRole(role)) {
    return { ok: false as const, error: "仅管理员可删除维保记录" };
  }
  const db = createDb(DB);
  await db.delete(maintenanceRecords).where(and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.assetId, assetId)));
  revalidatePath("/");
  revalidatePath("/devices", "layout");
  revalidatePath("/records");
  return { ok: true as const };
}
