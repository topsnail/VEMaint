import { useCallback, useState } from "react";
import { apiFetch } from "../lib/http";

export type OwnerDirectoryEntry = { name: string; address: string };

function normalizeOwnerDirectoryClient(input: unknown): OwnerDirectoryEntry[] {
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

export async function fetchSettingsSnapshot(): Promise<{
  dropdowns: Record<string, string[]>;
  ownerDirectory: OwnerDirectoryEntry[];
}> {
  const res = await apiFetch<{ config: { dropdowns?: Record<string, string[]>; ownerDirectory?: unknown } }>("/settings");
  if (!res.ok) return { dropdowns: {}, ownerDirectory: [] };
  return {
    dropdowns: res.data.config.dropdowns ?? {},
    ownerDirectory: normalizeOwnerDirectoryClient(res.data.config.ownerDirectory),
  };
}

export async function fetchSettingsDropdowns(): Promise<Record<string, string[]>> {
  const s = await fetchSettingsSnapshot();
  return s.dropdowns;
}

/** 系统配置中的下拉字典（车辆/维保等），多处页面复用 */
export function useSettingsDropdowns() {
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDropdowns(await fetchSettingsDropdowns());
    } finally {
      setLoading(false);
    }
  }, []);

  return { dropdowns, setDropdowns, loading, load };
}
