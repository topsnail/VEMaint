import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/http";
import { REFRESH_INTERVALS, SEARCH_CONFIG } from "../lib/config";
import { handleApiError } from "../lib/errorHandler";
import type { MaintenanceRecord, Vehicle } from "../types";

export type DashboardAlertItem = {
  alertKey: string;
  type: string;
  level: "within30" | "within7" | "expired";
  days?: number;
  kmLeft?: number;
  vehicleId: string;
  plateNo: string;
  ownerDept?: string;
  ownerPerson?: string;
  actionStatus?: "open" | "processing" | "resolved";
  actionHandler?: string | null;
  actionUpdatedAt?: string | null;
};

export type DashboardSearchResult = {
  vehicles: Array<{ id: string; plateNo: string; brandModel: string }>;
  maintenance: Array<{ id: string; itemDesc: string; plateNo: string | null; equipmentName: string | null }>;
};

export type DashboardOverview = {
  snapshotAt: string;
  kpis: {
    vehicles: {
      total: number;
      normal: number;
      repairing: number;
      stopped: number;
      scrapped: number;
    };
    maintenance: {
      todayCount: number;
      weekCount: number;
      monthCount: number;
      monthCost: number;
    };
    alerts: {
      expired: number;
      within7: number;
      within30: number;
      total: number;
    };
  };
  alerts: DashboardAlertItem[];
  pendingAlerts: DashboardAlertItem[];
  trends: Array<{ day: string; count: number; cost: number }>;
  rankings: {
    topCostVehicles: Array<{ vehicleId: string | null; plateNo: string; brandModel: string; recordCount: number; totalCost: number }>;
    topItems: Array<{ itemDesc: string; recordCount: number; totalCost: number }>;
  };
};

export function useDashboardOverview() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [search, setSearch] = useState<DashboardSearchResult>({ vehicles: [], maintenance: [] });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<DashboardOverview>("/dashboard/overview");
      if (res.ok) {
        setOverview(res.data);
        setLastUpdated(new Date().toLocaleString());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    let timer: ReturnType<typeof setInterval>;
    let isRefreshing = false;
    const refreshData = async () => {
      if (isRefreshing || document.hidden) return;
      isRefreshing = true;
      try {
        await loadOverview();
      } catch (error) {
        handleApiError(error);
      } finally {
        isRefreshing = false;
      }
    };
    timer = setInterval(refreshData, REFRESH_INTERVALS.DASHBOARD);
    const handleVisibilityChange = () => {
      if (!document.hidden) void refreshData();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadOverview]);

  const runSearch = useCallback((q: string) => {
    const key = q.trim();
    if (!key) {
      setSearch({ vehicles: [], maintenance: [] });
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const [v, m] = await Promise.all([
          apiFetch<{ vehicles: Vehicle[] }>(`/vehicles?q=${encodeURIComponent(key)}`),
          apiFetch<{ records: MaintenanceRecord[] }>(`/maintenance?q=${encodeURIComponent(key)}`),
        ]);
        setSearch({
          vehicles: v.ok ? v.data.vehicles.map((x) => ({ id: x.id, plateNo: x.plateNo, brandModel: x.brandModel })) : [],
          maintenance: m.ok
            ? m.data.records.map((x) => ({
                id: x.id,
                itemDesc: x.itemDesc,
                plateNo: x.plateNo ?? null,
                equipmentName: x.equipmentName ?? null,
              }))
            : [],
        });
      } catch (error) {
        handleApiError(error);
        setSearch({ vehicles: [], maintenance: [] });
      }
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);
  }, []);

  const updateAlertStatus = useCallback(
    async (alertKey: string, status: "open" | "processing" | "resolved") => {
      try {
        const res = await apiFetch<{ ok: true }>(`/dashboard/alerts/${encodeURIComponent(alertKey)}/action`, {
          method: "PUT",
          body: JSON.stringify({ status }),
        });
        if (res.ok) await loadOverview();
        else handleApiError(res);
      } catch (error) {
        handleApiError(error);
      }
    },
    [loadOverview],
  );

  const trendSummary = useMemo(() => {
    const data = overview?.trends ?? [];
    const totalCost = data.reduce((sum, x) => sum + Number(x.cost || 0), 0);
    const totalCount = data.reduce((sum, x) => sum + Number(x.count || 0), 0);
    return { totalCost, totalCount };
  }, [overview]);

  return {
    overview,
    search,
    loading,
    lastUpdated,
    loadOverview,
    runSearch,
    updateAlertStatus,
    trendSummary,
  };
}
