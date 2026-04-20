import { useCallback, useState } from "react";
import { apiFetch } from "../lib/http";
import { fetchSettingsDropdowns } from "./useSettingsDropdowns";
import type { MaintenanceRecord, Vehicle } from "../types";

export function useMaintenancePageData() {
  const [rows, setRows] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, vRes] = await Promise.all([
        apiFetch<{ records: MaintenanceRecord[] }>("/maintenance"),
        apiFetch<{ vehicles: Vehicle[] }>("/vehicles"),
      ]);
      if (mRes.ok) setRows(mRes.data.records);
      if (vRes.ok) setVehicles(vRes.data.vehicles);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDropdowns = useCallback(async () => {
    setDropdowns(await fetchSettingsDropdowns());
  }, []);

  const removeRecord = useCallback(async (id: string) => {
    return apiFetch<{ ok: true }>(`/maintenance/${id}`, { method: "DELETE" });
  }, []);

  const saveRecord = useCallback(async (editingId: string | null, payload: unknown) => {
    return apiFetch<{ id?: string }>(editingId ? `/maintenance/${editingId}` : "/maintenance", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
  }, []);

  return { rows, vehicles, dropdowns, loading, load, loadDropdowns, removeRecord, saveRecord };
}
