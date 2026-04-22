import { useEffect, useMemo, useState } from "react";
import type { MaintenanceRecord } from "../types";

export type MaintenanceViewMode = "all" | "vehicle" | "equipment";

type Args = {
  rows: MaintenanceRecord[];
  view: MaintenanceViewMode;
};

export function useMaintenanceListView({ rows, view }: Args) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterTargetType, setFilterTargetType] = useState<string>(view === "vehicle" ? "vehicle" : view === "equipment" ? "equipment" : "");
  const [filterMaintenanceType, setFilterMaintenanceType] = useState<string>("");
  const [filterVendor, setFilterVendor] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setFilterTargetType(view === "vehicle" ? "vehicle" : view === "equipment" ? "equipment" : "");
  }, [view]);

  const visibleRows = useMemo(() => {
    const byType = rows.filter((row) => {
      if (view === "vehicle") return row.targetType === "vehicle";
      if (view === "equipment") return row.targetType === "equipment";
      return true;
    });
    const byFilters = byType.filter((row) => {
      if (filterTargetType && row.targetType !== filterTargetType) return false;
      if (filterMaintenanceType && row.maintenanceType !== filterMaintenanceType) return false;
      if (filterVendor && (row.vendor ?? "") !== filterVendor) return false;
      return true;
    });
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return byFilters;
    return byFilters.filter((row) =>
      [row.plateNo, row.brandModel, row.itemDesc, row.vendor, row.equipmentName, row.maintenanceDate]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(kw)),
    );
  }, [filterMaintenanceType, filterTargetType, filterVendor, rows, searchKeyword, view]);

  const vendorFilterOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => (row.vendor ?? "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "zh-CN"))
        .map((v) => ({ label: v, value: v })),
    [rows],
  );

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [page, pageSize, visibleRows]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filterMaintenanceType, filterTargetType, filterVendor, pageSize, searchKeyword, view]);

  const resetFilters = () => {
    setSearchKeyword("");
    setFilterTargetType(view === "vehicle" ? "vehicle" : view === "equipment" ? "equipment" : "");
    setFilterMaintenanceType("");
    setFilterVendor("");
  };

  return {
    searchKeyword,
    setSearchKeyword,
    filterTargetType,
    setFilterTargetType,
    filterMaintenanceType,
    setFilterMaintenanceType,
    filterVendor,
    setFilterVendor,
    vendorFilterOptions,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    visibleRows,
    pagedRows,
    resetFilters,
  };
}

