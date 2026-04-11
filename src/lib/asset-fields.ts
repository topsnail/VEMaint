export type AssetType = "车辆" | "机械";

export type AssetFieldType = "text" | "number";

export type AssetFieldDef = {
  key: string;
  label: string;
  type: AssetFieldType;
  required?: boolean;
  placeholder?: string;
};

export type AssetFieldsConfig = {
  version: 1;
  byType: Record<AssetType, AssetFieldDef[]>;
};

export const KV_ASSET_FIELDS_KEY = "app:assetFields";

export const DEFAULT_ASSET_FIELDS: AssetFieldsConfig = {
  version: 1,
  byType: {
    车辆: [
      { key: "载重", label: "载重", type: "text", placeholder: "例如 1.5t" },
      { key: "排量", label: "排量", type: "text", placeholder: "例如 2.0L" },
    ],
    机械: [
      { key: "斗容", label: "斗容", type: "text", placeholder: "例如 0.6m³" },
      { key: "吨位", label: "吨位", type: "text", placeholder: "例如 20t" },
    ],
  },
};

export function parseAssetFieldsConfig(raw: string | null): AssetFieldsConfig {
  if (!raw?.trim()) return DEFAULT_ASSET_FIELDS;
  try {
    const v = JSON.parse(raw) as Partial<AssetFieldsConfig>;
    const byType = (v.byType ?? {}) as Record<string, unknown>;
    const norm = (t: AssetType) => {
      const arr = byType[t];
      if (!Array.isArray(arr)) return DEFAULT_ASSET_FIELDS.byType[t];
      const defs: AssetFieldDef[] = arr
        .map((x) => x as Partial<AssetFieldDef>)
        .filter((x) => typeof x.key === "string" && typeof x.label === "string" && (x.type === "text" || x.type === "number"))
        .map((x) => ({
          key: x.key!.trim(),
          label: x.label!.trim(),
          type: x.type as AssetFieldType,
          required: !!x.required,
          placeholder: typeof x.placeholder === "string" ? x.placeholder : undefined,
        }))
        .filter((x) => x.key && x.label);
      return defs.length ? defs : DEFAULT_ASSET_FIELDS.byType[t];
    };
    return { version: 1, byType: { 车辆: norm("车辆"), 机械: norm("机械") } };
  } catch {
    return DEFAULT_ASSET_FIELDS;
  }
}

