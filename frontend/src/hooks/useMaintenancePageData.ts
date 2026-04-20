import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/http";
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
  });

  const dropdownsQuery = useQuery({
    queryKey: ["maintenance-dropdowns"],
    queryFn: fetchSettingsDropdowns,
    refetchInterval: MAINTENANCE_AUTO_REFRESH_MS,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => apiFetch<{ ok: true }>(`/maintenance/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["maintenance-page-data"] });
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
    },
  });

  const rows = useMemo(() => baseQuery.data?.rows ?? [], [baseQuery.data?.rows]);
  const vehicles = useMemo(() => baseQuery.data?.vehicles ?? [], [baseQuery.data?.vehicles]);
  const dropdowns = useMemo(() => dropdownsQuery.data ?? {}, [dropdownsQuery.data]);

  const load = useCallback(async () => {
    await baseQuery.refetch();
  }, [baseQuery]);

  const loadDropdowns = useCallback(async () => {
    await dropdownsQuery.refetch();
  }, [dropdownsQuery]);

  const removeRecord = useCallback(async (id: string) => removeMutation.mutateAsync(id), [removeMutation]);

  const saveRecord = useCallback(
    async (editingId: string | null, payload: unknown) => saveMutation.mutateAsync({ editingId, payload }),
    [saveMutation],
  );

  return {
    rows,
    vehicles,
    dropdowns,
    loading: baseQuery.isFetching || dropdownsQuery.isFetching || removeMutation.isPending || saveMutation.isPending,
    load,
    loadDropdowns,
    removeRecord,
    saveRecord,
  };
}
