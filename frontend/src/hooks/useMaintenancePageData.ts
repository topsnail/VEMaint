import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/http";
import { APP_DATA_CHANGED_EVENT, emitAppDataChanged, type AppDataChangedDetail } from "../lib/realtimeSync";
import { fetchSettingsDropdowns } from "./useSettingsDropdowns";
import type { MaintenanceRecord, Vehicle } from "../types";

const MAINTENANCE_AUTO_REFRESH_MS = 45_000;

export function useMaintenancePageData() {
  const queryClient = useQueryClient();

  const baseQuery = useQuery({
    queryKey: ["maintenance-page-data"],
    queryFn: async () => {
      const [mRes, vRes] = await Promise.all([
        apiFetch<{ records: MaintenanceRecord[] }>("/maintenance"),
        apiFetch<{ vehicles: Vehicle[] }>("/vehicles"),
      ]);
      return {
        rows: mRes.ok ? mRes.data.records : [],
        vehicles: vRes.ok ? vRes.data.vehicles : [],
      };
    },
    refetchInterval: MAINTENANCE_AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
  });

  const dropdownsQuery = useQuery({
    queryKey: ["maintenance-dropdowns"],
    queryFn: fetchSettingsDropdowns,
    refetchInterval: MAINTENANCE_AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
  });

  const removeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string | null }) =>
      apiFetch<{ ok: true }>(`/maintenance/${id}`, { method: "DELETE", opReason: reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["maintenance-page-data"] });
      emitAppDataChanged(["maintenance", "vehicles", "dashboard"], "maintenance:deleted");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ editingId, payload }: { editingId: string | null; payload: unknown }) =>
      apiFetch<{ id?: string }>(editingId ? `/maintenance/${editingId}` : "/maintenance", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["maintenance-page-data"] });
      emitAppDataChanged(["maintenance", "vehicles", "dashboard"], "maintenance:saved");
    },
  });

  useEffect(() => {
    const onAppDataChanged = (evt: Event) => {
      const ce = evt as CustomEvent<AppDataChangedDetail>;
      const domains = ce.detail?.domains ?? [];
      if (domains.includes("maintenance") || domains.includes("vehicles") || domains.includes("settings")) {
        void baseQuery.refetch();
      }
      if (domains.includes("settings")) {
        void dropdownsQuery.refetch();
      }
    };
    window.addEventListener(APP_DATA_CHANGED_EVENT, onAppDataChanged as EventListener);
    return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, onAppDataChanged as EventListener);
  }, [baseQuery, dropdownsQuery]);

  const rows = useMemo(() => baseQuery.data?.rows ?? [], [baseQuery.data?.rows]);
  const vehicles = useMemo(() => baseQuery.data?.vehicles ?? [], [baseQuery.data?.vehicles]);
  const dropdowns = useMemo(() => dropdownsQuery.data ?? {}, [dropdownsQuery.data]);

  const load = useCallback(async () => {
    const next = await baseQuery.refetch();
    return {
      rows: next.data?.rows ?? [],
      vehicles: next.data?.vehicles ?? [],
    };
  }, [baseQuery]);
  const setRows = useCallback((next: MaintenanceRecord[] | ((prev: MaintenanceRecord[]) => MaintenanceRecord[])) => {
    queryClient.setQueryData<{ rows: MaintenanceRecord[]; vehicles: Vehicle[] } | undefined>(
      ["maintenance-page-data"],
      (prev) => {
        const prevRows = prev?.rows ?? [];
        const nextRows = typeof next === "function" ? next(prevRows) : next;
        return {
          rows: nextRows,
          vehicles: prev?.vehicles ?? [],
        };
      },
    );
  }, [queryClient]);

  const loadDropdowns = useCallback(async () => {
    await dropdownsQuery.refetch();
  }, [dropdownsQuery]);

  const removeRecord = useCallback(async (id: string, reason?: string | null) => removeMutation.mutateAsync({ id, reason }), [removeMutation]);

  const saveRecord = useCallback(
    async (editingId: string | null, payload: unknown) => saveMutation.mutateAsync({ editingId, payload }),
    [saveMutation],
  );

  return {
    rows,
    vehicles,
    dropdowns,
    loading: baseQuery.isLoading || dropdownsQuery.isLoading || removeMutation.isPending || saveMutation.isPending,
    savePending: saveMutation.isPending,
    removePending: removeMutation.isPending,
    load,
    setRows,
    loadDropdowns,
    removeRecord,
    saveRecord,
  };
}
