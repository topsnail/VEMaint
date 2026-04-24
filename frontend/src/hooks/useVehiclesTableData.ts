import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_DATA_CHANGED_EVENT, type AppDataChangedDetail } from "../lib/realtimeSync";
import { fetchSettingsSnapshot, type OwnerDirectoryEntry } from "./useSettingsDropdowns";
import { fetchVehiclesWithCyclesMap } from "./vehiclesApi";
import type { Vehicle, VehicleCycle } from "../types";

const VEHICLES_AUTO_REFRESH_MS = 45_000;

/** 车辆台账列表 + 周期字典 + 下拉配置 */
export function useVehiclesTableData() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles-table", search],
    queryFn: () => fetchVehiclesWithCyclesMap(search),
    refetchInterval: VEHICLES_AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings-snapshot"],
    queryFn: fetchSettingsSnapshot,
    refetchInterval: VEHICLES_AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => vehiclesQuery.data?.vehicles ?? [], [vehiclesQuery.data?.vehicles]);
  const cyclesByVehicleId = useMemo(() => vehiclesQuery.data?.cyclesByVehicleId ?? {}, [vehiclesQuery.data?.cyclesByVehicleId]);
  const dropdowns = useMemo(() => settingsQuery.data?.dropdowns ?? {}, [settingsQuery.data?.dropdowns]);
  const ownerDirectory = useMemo<OwnerDirectoryEntry[]>(() => settingsQuery.data?.ownerDirectory ?? [], [settingsQuery.data?.ownerDirectory]);

  const setRows = useCallback((next: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => {
    queryClient.setQueriesData<{ vehicles: Vehicle[]; cyclesByVehicleId: Record<string, VehicleCycle | null> } | undefined>(
      { queryKey: ["vehicles-table"] },
      (prev) => {
        const prevVehicles = prev?.vehicles ?? [];
        const nextVehicles = typeof next === "function" ? next(prevVehicles) : next;
        return {
          vehicles: nextVehicles,
          cyclesByVehicleId: prev?.cyclesByVehicleId ?? {},
        };
      },
    );
  }, [queryClient]);
  const setCyclesByVehicleId = useCallback((next: Record<string, VehicleCycle | null> | ((prev: Record<string, VehicleCycle | null>) => Record<string, VehicleCycle | null>)) => {
    queryClient.setQueriesData<{ vehicles: Vehicle[]; cyclesByVehicleId: Record<string, VehicleCycle | null> } | undefined>(
      { queryKey: ["vehicles-table"] },
      (prev) => {
        const prevCycles = prev?.cyclesByVehicleId ?? {};
        const nextCycles = typeof next === "function" ? next(prevCycles) : next;
        return {
          vehicles: prev?.vehicles ?? [],
          cyclesByVehicleId: nextCycles,
        };
      },
    );
  }, [queryClient]);

  const loadDropdowns = useCallback(async () => {
    await settingsQuery.refetch();
  }, [settingsQuery]);

  const load = useCallback(async (nextSearch: string) => {
    setSearch(nextSearch);
    return await queryClient.fetchQuery({
      queryKey: ["vehicles-table", nextSearch],
      queryFn: () => fetchVehiclesWithCyclesMap(nextSearch),
    });
  }, [queryClient]);

  useEffect(() => {
    const onAppDataChanged = (evt: Event) => {
      const ce = evt as CustomEvent<AppDataChangedDetail>;
      const domains = ce.detail?.domains ?? [];
      if (domains.includes("vehicles") || domains.includes("maintenance")) {
        void vehiclesQuery.refetch();
      }
      if (domains.includes("settings")) {
        void settingsQuery.refetch();
      }
    };
    window.addEventListener(APP_DATA_CHANGED_EVENT, onAppDataChanged as EventListener);
    return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, onAppDataChanged as EventListener);
  }, [settingsQuery, vehiclesQuery]);

  return {
    rows,
    setRows,
    cyclesByVehicleId,
    setCyclesByVehicleId,
    dropdowns,
    ownerDirectory,
    loading: vehiclesQuery.isLoading || settingsQuery.isLoading,
    load,
    loadDropdowns,
  };
}
