import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/http";
import { REFRESH_INTERVALS, SEARCH_CONFIG } from "../lib/config";
import { handleApiError } from "../lib/errorHandler";
import { APP_DATA_CHANGED_EVENT, emitAppDataChanged, type AppDataChangedDetail } from "../lib/realtimeSync";
import type { MaintenanceRecord, Vehicle } from "../types";

export const DASHBOARD_PENDING_ALERTS_EVENT = "dashboard:pending-alerts-updated";

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
  dropdowns?: Record<string, string[] | undefined>;
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

/** 趋势与 TOP5 等维保汇总：固定近一年（与后端默认 range 一致） */
const DASHBOARD_OVERVIEW_RANGE = "365d";

export function useDashboardOverview() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [search, setSearch] = useState<DashboardSearchResult>({ vehicles: [], maintenance: [] });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<DashboardOverview>(`/dashboard/overview?range=${encodeURIComponent(DASHBOARD_OVERVIEW_RANGE)}`);
      if (!res.ok) {
        handleApiError(res);
        return false;
      }
      setOverview(res.data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(DASHBOARD_PENDING_ALERTS_EVENT, {
            detail: { count: Number(res.data.pendingAlerts?.length ?? 0) },
          }),
        );
      }
      setLastUpdated(new Date().toLocaleString());
      return true;
    } catch (error) {
      handleApiError(error);
      return false;
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

  useEffect(() => {
    const onAppDataChanged = (evt: Event) => {
      const ce = evt as CustomEvent<AppDataChangedDetail>;
      const domains = ce.detail?.domains ?? [];
      if (domains.includes("dashboard") || domains.includes("maintenance") || domains.includes("vehicles")) {
        void loadOverview();
      }
    };
    window.addEventListener(APP_DATA_CHANGED_EVENT, onAppDataChanged as EventListener);
    return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, onAppDataChanged as EventListener);
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
        if (res.ok) {
          await loadOverview();
          emitAppDataChanged(["dashboard"], "dashboard:alert-status-updated");
        }
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
