export type MaintenanceResultStatus = "resolved" | "temporary" | "pending";

export type PartDetail = {
  partName?: string;
  spec?: string;
  unit?: string;
  qty?: number;
  unitPrice?: number;
};

export type ParsedMaintenanceMeta = {
  remark: string;
  laborCost?: number;
  materialCost?: number;
  miscCost?: number;
  equipmentType?: string;
  equipmentCategory?: string;
  resultStatus?: MaintenanceResultStatus;
  partDetails: PartDetail[];
  /** Multi-attachment keys stored in remark meta (backward compatible) */
  attachmentKeys: string[];
};

const COST_META_PREFIX = "__COST_META__:";
const EQUIP_META_PREFIX = "__EQUIP_META__:";
const MAINT_META_PREFIX = "__MAINT_META__:";

function toSafeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

function toSafeString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

export function calcPartStats(partDetails: PartDetail[] | null | undefined): { count: number; amount: number } {
  const rows = partDetails ?? [];
  const count = rows.filter((row) => !!String(row?.partName ?? "").trim()).length;
  const amount = rows.reduce((sum, row) => sum + Number(row?.qty ?? 0) * Number(row?.unitPrice ?? 0), 0);
  return { count, amount };
}

export function parseRemarkMeta(raw: string | null | undefined): ParsedMaintenanceMeta {
  const text = (raw ?? "").trim();
  if (!text) {
    return {
      remark: "",
      laborCost: undefined,
      materialCost: undefined,
      miscCost: undefined,
      equipmentType: undefined,
      equipmentCategory: undefined,
      resultStatus: undefined,
      partDetails: [],
      attachmentKeys: [],
    };
  }

  const lines = text.split("\n");
  const costMetaLine = lines.find((line) => line.startsWith(COST_META_PREFIX));
  const equipMetaLine = lines.find((line) => line.startsWith(EQUIP_META_PREFIX));
  const maintMetaLine = lines.find((line) => line.startsWith(MAINT_META_PREFIX));
  const visibleRemark = lines
    .filter((line) => !line.startsWith(COST_META_PREFIX) && !line.startsWith(EQUIP_META_PREFIX) && !line.startsWith(MAINT_META_PREFIX))
    .join("\n")
    .trim();

  const parsed: ParsedMaintenanceMeta = {
    remark: visibleRemark,
    laborCost: undefined,
    materialCost: undefined,
    miscCost: undefined,
    equipmentType: undefined,
    equipmentCategory: undefined,
    resultStatus: undefined,
    partDetails: [],
    attachmentKeys: [],
  };

  const costMetaJson = costMetaLine?.slice(COST_META_PREFIX.length).trim();
  try {
    if (costMetaJson) {
      const cost = JSON.parse(costMetaJson) as { laborCost?: unknown; materialCost?: unknown; miscCost?: unknown };
      parsed.laborCost = toSafeNumber(cost.laborCost);
      parsed.materialCost = toSafeNumber(cost.materialCost);
      parsed.miscCost = toSafeNumber(cost.miscCost);
    }
  } catch {
    // ignore malformed meta
  }

  const equipMetaJson = equipMetaLine?.slice(EQUIP_META_PREFIX.length).trim();
  try {
    if (equipMetaJson) {
      const equip = JSON.parse(equipMetaJson) as {
        equipmentType?: unknown;
        equipmentCategory?: unknown;
      };
      parsed.equipmentType = toSafeString(equip.equipmentType);
      parsed.equipmentCategory = toSafeString(equip.equipmentCategory);
    }
  } catch {
    // ignore malformed meta
  }

  const maintMetaJson = maintMetaLine?.slice(MAINT_META_PREFIX.length).trim();
  try {
    if (maintMetaJson) {
      const maint = JSON.parse(maintMetaJson) as {
        resultStatus?: unknown;
        partDetails?: unknown;
        attachmentKeys?: unknown;
      };
      if (maint.resultStatus === "resolved" || maint.resultStatus === "temporary" || maint.resultStatus === "pending") {
        parsed.resultStatus = maint.resultStatus;
      }
      if (Array.isArray(maint.partDetails)) {
        parsed.partDetails = maint.partDetails
          .filter((row) => row && typeof row === "object")
          .map((row) => {
            const detail = row as { partName?: unknown; spec?: unknown; unit?: unknown; qty?: unknown; unitPrice?: unknown };
            return {
              partName: String(detail.partName ?? "").trim(),
              spec: String(detail.spec ?? "").trim(),
              unit: String(detail.unit ?? "").trim(),
              qty: toSafeNumber(detail.qty),
              unitPrice: toSafeNumber(detail.unitPrice),
            };
          });
      }
      if (Array.isArray(maint.attachmentKeys)) {
        parsed.attachmentKeys = maint.attachmentKeys
          .map((k) => String(k ?? "").trim())
          .filter(Boolean)
          .filter((k, idx, arr) => arr.indexOf(k) === idx);
      }
    }
  } catch {
    // ignore malformed meta
  }

  return parsed;
}

type JoinRemarkMetaParams = {
  remark?: string;
  laborCost?: number;
  materialCost?: number;
  miscCost?: number;
  equipmentType?: string;
  equipmentCategory?: string;
  resultStatus?: MaintenanceResultStatus;
  partDetails?: PartDetail[];
  attachmentKeys?: string[];
};

export function joinRemarkMeta(params: JoinRemarkMetaParams): string | null {
  const { remark, laborCost, materialCost, miscCost, equipmentType, equipmentCategory, resultStatus, partDetails, attachmentKeys } = params;
  const cleanRemark = (remark ?? "").trim();
  const hasBreakdown = [laborCost, materialCost, miscCost].some((value) => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const hasEquipMeta = [equipmentType, equipmentCategory].some((value) => !!String(value ?? "").trim());
  const cleanParts =
    partDetails
      ?.map((row) => ({
        partName: String(row?.partName ?? "").trim(),
        spec: String(row?.spec ?? "").trim(),
        unit: String(row?.unit ?? "").trim(),
        qty: toSafeNumber(row?.qty),
        unitPrice: toSafeNumber(row?.unitPrice),
      }))
      .filter((row) => row.partName || row.spec || row.unit || typeof row.qty === "number" || typeof row.unitPrice === "number") ?? [];
  const hasMaintMeta = !!resultStatus || cleanParts.length > 0;
  const cleanAttachmentKeys =
    attachmentKeys
      ?.map((k) => String(k ?? "").trim())
      .filter(Boolean)
      .filter((k, idx, arr) => arr.indexOf(k) === idx) ?? [];
  const hasMaintMetaOrAttachments = hasMaintMeta || cleanAttachmentKeys.length > 0;

  const lines: string[] = [];
  if (cleanRemark) lines.push(cleanRemark);
  if (hasBreakdown) {
    lines.push(
      `${COST_META_PREFIX}${JSON.stringify({
        laborCost: toSafeNumber(laborCost),
        materialCost: toSafeNumber(materialCost),
        miscCost: toSafeNumber(miscCost),
      })}`,
    );
  }
  if (hasEquipMeta) {
    lines.push(
      `${EQUIP_META_PREFIX}${JSON.stringify({
        equipmentType: toSafeString(equipmentType),
        equipmentCategory: toSafeString(equipmentCategory),
      })}`,
    );
  }
  if (hasMaintMetaOrAttachments) {
    lines.push(
      `${MAINT_META_PREFIX}${JSON.stringify({
        resultStatus: resultStatus || undefined,
        partDetails: cleanParts.length > 0 ? cleanParts : undefined,
        attachmentKeys: cleanAttachmentKeys.length > 0 ? cleanAttachmentKeys : undefined,
      })}`,
    );
  }

  return lines.length > 0 ? lines.join("\n") : null;
}
