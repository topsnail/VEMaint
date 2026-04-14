"use server";

import { createDb } from "@/db";
import { assetStatusLogs, assets } from "@/db/schema";
import { getCloudflareEnv } from "@/lib/cf-env";
import { canWriteByRole } from "@/lib/authz";
import { getCurrentUserRole } from "@/lib/auth-session";
import { writeAuditLog } from "@/lib/audit";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type CreateAssetInput = {
  name: string;
  type: string;
  identifier: string;
  purchaseDate?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  operatingPermitExpiry?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceMileage?: string;
  currentMileage?: string;
  currentHours?: string;
  status?: string;
  metadataJson?: string;
};

function parseMetadata(raw: string | undefined): Record<string, unknown> | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    const v = JSON.parse(t) as unknown;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export type UpdateAssetInput = {
  id: string;
  name: string;
  type: string;
  identifier: string;
  purchaseDate?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  operatingPermitExpiry?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceMileage?: string;
  currentMileage?: string;
  currentHours?: string;
  status?: string;
  metadataJson?: string;
};

export async function createAsset(input: CreateAssetInput) {
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止新增" };
  }
  const db = createDb(DB);

  const name = input.name?.trim();
  const identifier = input.identifier?.trim();
  if (!name || !identifier) {
    return { ok: false as const, error: "名称与标识必填" };
  }
  if (input.type !== "车辆" && input.type !== "机械") {
    return { ok: false as const, error: "类型须为「车辆」或「机械」" };
  }

  const metadata = parseMetadata(input.metadataJson);
  if (input.metadataJson?.trim() && metadata === null) {
    return { ok: false as const, error: "扩展信息必须是合法的结构化对象" };
  }

  const id = crypto.randomUUID();
  const status = input.status?.trim() || "active";

  await db.insert(assets).values({
    id,
    name,
    type: input.type,
    identifier,
    purchaseDate: input.purchaseDate?.trim() || null,
    insuranceExpiry: input.insuranceExpiry?.trim() || null,
    inspectionExpiry: input.inspectionExpiry?.trim() || null,
    operatingPermitExpiry: input.operatingPermitExpiry?.trim() || null,
    lastMaintenanceDate: input.lastMaintenanceDate?.trim() || null,
    nextMaintenanceMileage: input.nextMaintenanceMileage?.trim() || null,
    currentMileage: input.currentMileage?.trim() || null,
    currentHours: input.currentHours?.trim() || null,
    status,
    metadata,
  });

  revalidatePath("/");
  revalidatePath("/devices", "layout");
  return { ok: true as const, id };
}

export async function updateAsset(input: UpdateAssetInput) {
  const { DB } = getCloudflareEnv();
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止编辑" };
  }
  const db = createDb(DB);

  const id = input.id?.trim();
  const name = input.name?.trim();
  const identifier = input.identifier?.trim();
  if (!id) return { ok: false as const, error: "无效编号" };
  if (!name || !identifier) return { ok: false as const, error: "名称与标识必填" };
  if (input.type !== "车辆" && input.type !== "机械") {
    return { ok: false as const, error: "类型须为「车辆」或「机械」" };
  }

  const status = input.status?.trim() || "active";
  const prev = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  const prevStatus = prev[0]?.status ?? status;
  const metadata = parseMetadata(input.metadataJson);
  if (input.metadataJson?.trim() && metadata === null) {
    return { ok: false as const, error: "扩展信息必须是合法的结构化对象" };
  }

  await db
    .update(assets)
    .set({
      name,
      type: input.type,
      identifier,
      purchaseDate: input.purchaseDate?.trim() || null,
      insuranceExpiry: input.insuranceExpiry?.trim() || null,
      inspectionExpiry: input.inspectionExpiry?.trim() || null,
      operatingPermitExpiry: input.operatingPermitExpiry?.trim() || null,
      lastMaintenanceDate: input.lastMaintenanceDate?.trim() || null,
      nextMaintenanceMileage: input.nextMaintenanceMileage?.trim() || null,
      currentMileage: input.currentMileage?.trim() || null,
      currentHours: input.currentHours?.trim() || null,
      status,
      metadata,
    })
    .where(eq(assets.id, id));

  if (prevStatus !== status) {
    await db.insert(assetStatusLogs).values({
      id: crypto.randomUUID(),
      assetId: id,
      fromStatus: prevStatus,
      toStatus: status,
      note: "手动状态变更",
    });
  }

  revalidatePath("/");
  revalidatePath("/devices", "layout");
  return { ok: true as const };
}

export async function listAssetStatusLogs(assetIdRaw: string) {
  const assetId = assetIdRaw?.trim();
  if (!assetId) return [];
  const { DB } = getCloudflareEnv();
  const db = createDb(DB);
  return db
    .select()
    .from(assetStatusLogs)
    .where(eq(assetStatusLogs.assetId, assetId))
    .orderBy(desc(assetStatusLogs.createdAt));
}

export async function importAssetsFromCsv(csvRaw: string) {
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) {
    return { ok: false as const, error: "当前为只读访客模式，禁止导入" };
  }
  void csvRaw;
  return { ok: false as const, error: "导入仅支持电子表格（.xlsx）格式，请使用电子表格文件导入。" };
}

export type ImportAssetRow = {
  name: string;
  type: string;
  identifier: string;
  purchaseDate?: string;
  status?: string;
};

function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function importAssetsFromExcelRows(rows: ImportAssetRow[]) {
  const role = await getCurrentUserRole();
  if (!canWriteByRole(role)) return { ok: false as const, error: "当前为只读访客模式，禁止导入" };
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false as const, error: "电子表格数据为空" };
  if (rows.length > 2000) return { ok: false as const, error: "单次导入最多 2000 行" };

  const { DB } = getCloudflareEnv();
  const db = createDb(DB);

  const errors: { row: number; error: string }[] = [];
  const inserts: (typeof assets.$inferInsert)[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i] ?? ({} as ImportAssetRow);
    const name = String(r.name ?? "").trim();
    const identifier = String(r.identifier ?? "").trim();
    const typeRaw = String(r.type ?? "").trim();
    const type = typeRaw === "机械" ? "机械" : typeRaw === "车辆" ? "车辆" : "";
    const purchaseDate = String(r.purchaseDate ?? "").trim();
    const status = String(r.status ?? "").trim() || "active";

    if (!name) {
      errors.push({ row: i + 2, error: "名称必填" });
      continue;
    }
    if (!identifier) {
      errors.push({ row: i + 2, error: "标识必填" });
      continue;
    }
    if (!type) {
      errors.push({ row: i + 2, error: "类型仅支持 车辆/机械" });
      continue;
    }
    if (purchaseDate && !isIsoDate(purchaseDate)) {
      errors.push({ row: i + 2, error: "购置日期格式须为 例如 2026-01-31" });
      continue;
    }

    inserts.push({
      id: crypto.randomUUID(),
      name,
      identifier,
      type,
      purchaseDate: purchaseDate || null,
      status,
      insuranceExpiry: null,
      inspectionExpiry: null,
      operatingPermitExpiry: null,
      lastMaintenanceDate: null,
      nextMaintenanceMileage: null,
      currentMileage: null,
      currentHours: null,
      metadata: null,
    });
  }

  if (inserts.length === 0) return { ok: false as const, error: "无可导入行", errors };

  // 简单按行插入，避免单批超限制；后续可优化为 chunk/事务
  let created = 0;
  for (const v of inserts) {
    await db.insert(assets).values(v);
    created += 1;
  }

  revalidatePath("/");
  revalidatePath("/devices", "layout");
  await writeAuditLog({
    action: "assets.import_excel",
    target: "assets",
    detail: { inputRows: rows.length, created, skipped: errors.length },
  });
  return { ok: true as const, created, errors };
}
