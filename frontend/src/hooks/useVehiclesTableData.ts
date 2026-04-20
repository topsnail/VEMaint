import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  });

  const settingsQuery = useQuery({
    queryKey: ["settings-snapshot"],
    queryFn: fetchSettingsSnapshot,
    refetchInterval: VEHICLES_AUTO_REFRESH_MS,
  });

  const rows = useMemo(() => vehiclesQuery.data?.vehicles ?? [], [vehiclesQuery.data?.vehicles]);
  const cyclesByVehicleId = useMemo(() => vehiclesQuery.data?.cyclesByVehicleId ?? {}, [vehiclesQuery.data?.cyclesByVehicleId]);
  const dropdowns = useMemo(() => settingsQuery.data?.dropdowns ?? {}, [settingsQuery.data?.dropdowns]);
  const ownerDirectory = useMemo<OwnerDirectoryEntry[]>(() => settingsQuery.data?.ownerDirectory ?? [], [settingsQuery.data?.ownerDirectory]);

  const setRows = useCallback((_next: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => {
    // react-query source of truth; keep API compatibility without local mutable state
  }, []);
  const setCyclesByVehicleId = useCallback((_next: Record<string, VehicleCycle | null>) => {
    // react-query source of truth; keep API compatibility without local mutable state
  }, []);

  const loadDropdowns = useCallback(async () => {
    await settingsQuery.refetch();
  }, [settingsQuery]);

  const load = useCallback(async (nextSearch: string) => {
    setSearch(nextSearch);
    await queryClient.fetchQuery({
      queryKey: ["vehicles-table", nextSearch],
      queryFn: () => fetchVehiclesWithCyclesMap(nextSearch),
    });
  }, [queryClient]);

  return {
    rows,
    setRows,
    cyclesByVehicleId,
    setCyclesByVehicleId,
    dropdowns,
    ownerDirectory,
    loading: vehiclesQuery.isFetching || settingsQuery.isFetching,
    load,
    loadDropdowns,
  };
}
