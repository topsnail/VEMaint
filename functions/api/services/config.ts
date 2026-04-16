const KEY = "sys:config:v1";

export type SystemConfig = {
  siteName: string;
  warnDays: number;
  versionNote: string;
  dropdowns: Record<string, string[]>;
};

const DEFAULT_CONFIG: SystemConfig = { siteName: "VEMaint", warnDays: 7, versionNote: "v1.0.0", dropdowns: {} };

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
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setSystemConfig(kv: KVNamespace, cfg: SystemConfig) {
  await kv.put(KEY, JSON.stringify(cfg));
}

