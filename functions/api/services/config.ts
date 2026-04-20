import { DEFAULT_ROLE_PERMISSIONS, normalizeRolePermissions, type RolePermissions } from "../lib/permissions";

const KEY = "sys:config:v1";

/** 车辆所有人与住址对照（用于台账录入时自动填住址） */
export type OwnerDirectoryEntry = { name: string; address: string };

export type SystemConfig = {
  siteName: string;
  warnDays: number;
  versionNote: string;
  dropdowns: Record<string, string[]>;
  ownerDirectory: OwnerDirectoryEntry[];
  permissions: {
    roles: RolePermissions;
  };
};

const DEFAULT_CONFIG: SystemConfig = {
  siteName: "VEMaint",
  warnDays: 7,
  versionNote: "v1.0.0",
  dropdowns: {},
  ownerDirectory: [],
  permissions: { roles: DEFAULT_ROLE_PERMISSIONS },
};

export function normalizeOwnerDirectory(input: unknown): OwnerDirectoryEntry[] {
  if (!Array.isArray(input)) return [];
  const byName = new Map<string, string>();
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as { name?: unknown }).name ?? "").trim();
    const address = String((item as { address?: unknown }).address ?? "").trim();
    if (!name || !address) continue;
    byName.set(name, address);
  }
  return Array.from(byName.entries()).map(([name, address]) => ({ name, address }));
}

function normalizeDropdowns(input: unknown): Record<string, string[]> {
  if (!input || typeof input !== "object") return {};
  const obj = input as Record<string, unknown>;
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = key.trim();
    if (!cleanKey) continue;
    const arr = Array.isArray(value) ? value : [];
    const seen = new Set<string>();
    const options: string[] = [];
    for (const item of arr) {
      const text = String(item ?? "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      options.push(text);
    }
    if (options.length > 0) result[cleanKey] = options;
  }
  return result;
}

export async function getSystemConfig(kv: KVNamespace): Promise<SystemConfig> {
  const raw = await kv.get(KEY, "text");
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<SystemConfig>;
    return {
      siteName: typeof parsed.siteName === "string" && parsed.siteName.trim() ? parsed.siteName.trim() : "VEMaint",
      warnDays:
        typeof parsed.warnDays === "number" && Number.isFinite(parsed.warnDays)
          ? Math.max(1, Math.min(30, Math.round(parsed.warnDays)))
          : 7,
      versionNote:
        typeof parsed.versionNote === "string" && parsed.versionNote.trim() ? parsed.versionNote.trim() : "v1.0.0",
      dropdowns: normalizeDropdowns((parsed as { dropdowns?: unknown }).dropdowns),
      ownerDirectory: normalizeOwnerDirectory((parsed as { ownerDirectory?: unknown }).ownerDirectory),
      permissions: {
        roles: normalizeRolePermissions((parsed as { permissions?: unknown }).permissions),
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setSystemConfig(kv: KVNamespace, cfg: SystemConfig) {
  await kv.put(KEY, JSON.stringify(cfg));
}

