import { useCallback, useState } from "react";
import { fetchSettingsSnapshot, type OwnerDirectoryEntry } from "./useSettingsDropdowns";
import { fetchVehiclesWithCyclesMap } from "./vehiclesApi";
import type { Vehicle, VehicleCycle } from "../types";

/** 车辆台账列表 + 周期字典 + 下拉配置 */
export function useVehiclesTableData() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [cyclesByVehicleId, setCyclesByVehicleId] = useState<Record<string, VehicleCycle | null>>({});
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [ownerDirectory, setOwnerDirectory] = useState<OwnerDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDropdowns = useCallback(async () => {
    const s = await fetchSettingsSnapshot();
    setDropdowns(s.dropdowns);
    setOwnerDirectory(s.ownerDirectory);
  }, []);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const { vehicles, cyclesByVehicleId: map } = await fetchVehiclesWithCyclesMap(search);
      setRows(vehicles);
      setCyclesByVehicleId(map);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rows,
    setRows,
    cyclesByVehicleId,
    setCyclesByVehicleId,
    dropdowns,
    ownerDirectory,
    loading,
    load,
    loadDropdowns,
  };
}
