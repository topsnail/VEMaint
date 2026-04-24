import { useCallback, useState } from "react";
import { apiFetch } from "../lib/http";
import type { RolePermissions } from "../lib/permissions";
import type { OwnerDirectoryEntry } from "./useSettingsDropdowns";

export type ConfigLoadPayload = {
  siteName: string;
  warnDays: number;
  versionNote: string;
  dropdowns: Record<string, string[]>;
  ownerDirectory?: OwnerDirectoryEntry[];
  permissions: { roles?: RolePermissions } | undefined;
};

export function useConfigSettings() {
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ config: ConfigLoadPayload }>("/settings");
      if (!res.ok) return null;
      return res.data.config;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback(async (payload: unknown, reason?: string | null) => {
    return apiFetch<{ ok: true }>("/settings", { method: "PUT", body: JSON.stringify(payload), opReason: reason });
  }, []);

  return { loading, fetchConfig, saveConfig };
}
