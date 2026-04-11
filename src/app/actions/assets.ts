"use server";

import { createDb } from "@/db";
import { assetStatusLogs, assets } from "@/db/schema";
import { getCloudflareEnv } from "@/lib/cf-env";
import { loadAppSettings } from "@/lib/app-settings";
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
  const { DB, KV } = getCloudflareEnv();
  const app = await loadAppSettings(KV);
  if (app.roleMode === "viewer") {
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
    return { ok: false as const, error: "metadata 须为合法 JSON 对象" };
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
  const { DB, KV } = getCloudflareEnv();
  const app = await loadAppSettings(KV);
  if (app.roleMode === "viewer") {
    return { ok: false as const, error: "当前为只读访客模式，禁止编辑" };
  }
  const db = createDb(DB);

  const id = input.id?.trim();
  const name = input.name?.trim();
  const identifier = input.identifier?.trim();
  if (!id) return { ok: false as const, error: "无效 ID" };
  if (!name || !identifier) return { ok: false as const, error: "名称与标识必填" };
  if (input.type !== "车辆" && input.type !== "机械") {
    return { ok: false as const, error: "类型须为「车辆」或「机械」" };
  }

  const status = input.status?.trim() || "active";
  const prev = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  const prevStatus = prev[0]?.status ?? status;
  const metadata = parseMetadata(input.metadataJson);
  if (input.metadataJson?.trim() && metadata === null) {
    return { ok: false as const, error: "metadata 须为合法 JSON 对象" };
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
  const { KV } = getCloudflareEnv();
  const app = await loadAppSettings(KV);
  if (app.roleMode === "viewer") {
    return { ok: false as const, error: "当前为只读访客模式，禁止导入" };
  }
  const text = csvRaw?.trim();
  if (!text) return { ok: false as const, error: "CSV 内容为空" };
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rows.length < 2) return { ok: false as const, error: "至少需要表头+1行数据" };
  const header = rows[0].split(",").map((s) => s.trim());
  const idx = {
    name: header.indexOf("name"),
    type: header.indexOf("type"),
    identifier: header.indexOf("identifier"),
    purchaseDate: header.indexOf("purchaseDate"),
    status: header.indexOf("status"),
  };
  if (idx.name < 0 || idx.type < 0 || idx.identifier < 0) {
    return { ok: false as const, error: "表头至少包含 name,type,identifier" };
  }

  const { DB } = getCloudflareEnv();
  const db = createDb(DB);
  let created = 0;
  for (const line of rows.slice(1)) {
    const cols = line.split(",").map((s) => s.trim());
    const name = cols[idx.name] ?? "";
    const type = cols[idx.type] ?? "车辆";
    const identifier = cols[idx.identifier] ?? "";
    if (!name || !identifier) continue;
    await db.insert(assets).values({
      id: crypto.randomUUID(),
      name,
      type: type === "机械" ? "机械" : "车辆",
      identifier,
      purchaseDate: idx.purchaseDate >= 0 ? cols[idx.purchaseDate] || null : null,
      status: idx.status >= 0 ? cols[idx.status] || "active" : "active",
    });
    created += 1;
  }
  revalidatePath("/");
  revalidatePath("/devices", "layout");
  return { ok: true as const, created };
}
