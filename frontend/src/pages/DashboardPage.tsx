import { Button, Card, Input, List, Progress, Skeleton, Space, Table, Typography } from "@/components/ui/legacy";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCallback, useEffect, useId, useMemo, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { PageContainer } from "../components/PageContainer";
import { KpiCard } from "../components/KpiCard";
import { cardTableScroll, cardTableSticky } from "../lib/tableConfig";
import { AlertItem as AlertItemComponent } from "../components/AlertItem";
import { PendingAlertItem } from "../components/PendingAlertItem";
import type { DashboardAlertItem } from "../hooks/useDashboardOverview";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { safeJsonParse } from "../lib/safeJson";

const dashCardClass =
  "rounded-[6px] border border-slate-200 bg-white shadow-sm shadow-slate-900/5";

const dashCardTitle = (text: string) => (
  <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{text}</span>
);

const dashHeadClass = "min-h-11 px-3 py-1.5";
const dashBodyClass = "p-2.5";
const dashTwoColGridClass = "grid grid-cols-1 gap-4 xl:grid-cols-2";
const DASH_ALERT_PREVIEW_COUNT = 5;
const DASH_ALERT_LIST_HEIGHT = "max-h-[430px]";
const DASH_CONTENT_PANEL_CLASS =
  "overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm shadow-slate-900/5";
const DASH_SEARCH_HISTORY_KEY = "dashboard:search-history:v1";
const DASH_SEARCH_HISTORY_MAX = 5;

function readDashSearchHistory(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(DASH_SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = safeJsonParse<unknown>(raw, { fallback: null });
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, DASH_SEARCH_HISTORY_MAX);
  } catch {
    return [];
  }
}

type AlertLevelFilter = "all" | "expired" | "within7" | "within30";
type AlertStatusFilter = "all" | "open" | "processing" | "resolved";
const DASHBOARD_UI_STATE_KEY = "dashboard:ui-state:v1";

type DashboardUiState = {
  showAllAlerts: boolean;
  showAllPendingAlerts: boolean;
  alertLevelFilter: AlertLevelFilter;
  pendingStatusFilter: AlertStatusFilter;
};

function readDashboardUiState(): DashboardUiState | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(DASHBOARD_UI_STATE_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse<Partial<DashboardUiState>>(raw, { fallback: {} });
    const alertLevelFilter: AlertLevelFilter =
      parsed.alertLevelFilter === "expired" ||
      parsed.alertLevelFilter === "within7" ||
      parsed.alertLevelFilter === "within30"
        ? parsed.alertLevelFilter
        : "all";
    const pendingStatusFilter: AlertStatusFilter =
      parsed.pendingStatusFilter === "open" ||
      parsed.pendingStatusFilter === "processing" ||
      parsed.pendingStatusFilter === "resolved"
        ? parsed.pendingStatusFilter
        : "all";
    return {
      showAllAlerts: Boolean(parsed.showAllAlerts),
      showAllPendingAlerts: Boolean(parsed.showAllPendingAlerts),
      alertLevelFilter,
      pendingStatusFilter,
    };
  } catch {
    return null;
  }
}

export function DashboardPage({ canHandleAlerts = false }: { canHandleAlerts?: boolean }) {
  const nav = useNavigate();
  const searchHintId = useId();
  const persistedUiState = useMemo(() => readDashboardUiState(), []);
  const { overview, search, loading, lastUpdated, loadOverview, runSearch, updateAlertStatus } = useDashboardOverview();
  const [searchInput, setSearchInput] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>(() => readDashSearchHistory());

  const commitDashboardSearch = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed) {
        try {
          const next = [trimmed, ...readDashSearchHistory().filter((x) => x !== trimmed)].slice(0, DASH_SEARCH_HISTORY_MAX);
          window.localStorage.setItem(DASH_SEARCH_HISTORY_KEY, JSON.stringify(next));
          setSearchHistory(next);
        } catch {
          // ignore
        }
      }
      runSearch(raw);
    },
    [runSearch],
  );
  const [showAllAlerts, setShowAllAlerts] = useState(persistedUiState?.showAllAlerts ?? false);
  const [showAllPendingAlerts, setShowAllPendingAlerts] = useState(persistedUiState?.showAllPendingAlerts ?? false);
  const [alertLevelFilter, setAlertLevelFilter] = useState<AlertLevelFilter>(persistedUiState?.alertLevelFilter ?? "all");
  const [pendingStatusFilter, setPendingStatusFilter] = useState<AlertStatusFilter>(persistedUiState?.pendingStatusFilter ?? "all");

  const alerts = overview?.alerts ?? [];
  const pendingAlerts = overview?.pendingAlerts ?? [];
  const actionStatusLabels = useMemo(() => {
    const dict = overview?.dropdowns?.alertActionStatus ?? null;
    if (Array.isArray(dict) && dict.length >= 3) return dict.slice(0, 3) as string[];
    return ["待处理", "处理中", "已处理"] as string[];
  }, [overview?.dropdowns]);
  const filteredAlerts = alerts.filter((a) => (alertLevelFilter === "all" ? true : a.level === alertLevelFilter));
  const filteredPendingAlerts = pendingAlerts.filter((a) => {
    if (pendingStatusFilter === "all") return true;
    const status = a.actionStatus === "processing" ? "processing" : a.actionStatus === "resolved" ? "resolved" : "open";
    return status === pendingStatusFilter;
  });
  const pendingOpenCount = pendingAlerts.filter((a) => (a.actionStatus ?? "open") === "open").length;
  const pendingProcessingCount = pendingAlerts.filter((a) => a.actionStatus === "processing").length;
  const pendingResolvedCount = pendingAlerts.filter((a) => a.actionStatus === "resolved").length;
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const nextState: DashboardUiState = {
        showAllAlerts,
        showAllPendingAlerts,
        alertLevelFilter,
        pendingStatusFilter,
      };
      window.localStorage.setItem(DASHBOARD_UI_STATE_KEY, JSON.stringify(nextState));
    } catch {
      // ignore localStorage failures
    }
  }, [showAllAlerts, showAllPendingAlerts, alertLevelFilter, pendingStatusFilter]);
  const visibleAlerts = showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, DASH_ALERT_PREVIEW_COUNT);
  const visiblePendingAlerts = showAllPendingAlerts
    ? filteredPendingAlerts
    : filteredPendingAlerts.slice(0, DASH_ALERT_PREVIEW_COUNT);
  const goVehicles = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    nav(`/vehicles?${sp.toString()}`);
  };
  const goMaintenanceVehiclesSearch = (q: string) => {
    const t = q.trim();
    if (!t) return;
    nav(`/maintenance/vehicles?q=${encodeURIComponent(t)}`);
  };
  const topCostVehicles = overview?.rankings.topCostVehicles ?? [];
  const topMaintenanceItems = overview?.rankings.topItems ?? [];
  const openAlertAction = (a: DashboardAlertItem) => {
    if (a.type === "保险" || a.type === "年审" || a.type === "保养日期") {
      goVehicles({ q: a.plateNo, due: a.level === "expired" ? "overdue" : a.level });
      return;
    }
    goVehicles({ q: a.plateNo });
  };

  const refresh = async () => {
    const ok = await loadOverview();
    if (ok) return;
    toast.error("加载失败", {
      description: "请检查网络或权限设置，然后重试。",
      action: {
        label: "重试",
        onClick: () => {
          void refresh();
        },
      },
    });
  };

  return (
    <PageContainer
      title="仪表盘"
      breadcrumb={[
        { title: "首页", path: "/" },
        { title: "仪表盘" },
      ]}
    >
      {loading && !overview ? (
        <Skeleton active paragraph={{ rows: 16 }} className="mt-2" />
      ) : (
      <div className="w-full space-y-4">
      {/* Bento：核心 KPI 栅格（12 列） */}
      <Card
        title={dashCardTitle("实时数据概览")}
        className={dashCardClass}
        headClassName={dashHeadClass}
        bodyClassName={dashBodyClass}
        extra={
          <Space size="middle">
            <Typography.Text type="secondary" className="text-sm text-slate-500">
              {lastUpdated ? `更新时间：${lastUpdated}` : "初始化中"}
            </Typography.Text>
            <Button
              size="small"
              onClick={refresh}
              loading={loading}
              className="h-7 rounded-[6px] border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm shadow-slate-900/5 hover:bg-slate-50"
            >
              刷新
            </Button>
          </Space>
        }
      >
        <div className="space-y-4">
          <div>
            <Typography.Text className="mb-2 block text-xs font-medium tracking-wide text-slate-500">车辆概况</Typography.Text>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-12">
              <div className="col-span-2 lg:col-span-5">
                <KpiCard
                  title="车辆总数"
                  value={overview?.kpis.vehicles.total ?? 0}
                  valueStyle={{ fontSize: "26px", fontWeight: "600" }}
                  onClick={() => goVehicles({})}
                />
              </div>
              <div className="col-span-2 lg:col-span-7">
                <div className="grid h-full grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                  <KpiCard
                    title="正常车辆"
                    value={overview?.kpis.vehicles.normal ?? 0}
                    valueStyle={{ color: "#16a34a", fontSize: "22px", fontWeight: "600" }}
                    onClick={() => goVehicles({ status: "normal" })}
                  />
                  <KpiCard
                    title="维修中"
                    value={overview?.kpis.vehicles.repairing ?? 0}
                    valueStyle={{ color: "#d97706", fontSize: "22px", fontWeight: "600" }}
                    onClick={() => goVehicles({ status: "repairing" })}
                  />
                  <KpiCard
                    title="停用/报废"
                    value={(overview?.kpis.vehicles.stopped ?? 0) + (overview?.kpis.vehicles.scrapped ?? 0)}
                    valueStyle={{ color: "#dc2626", fontSize: "22px", fontWeight: "600" }}
                    onClick={() => goVehicles({ status: "stopped" })}
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <Typography.Text className="mb-2 block text-xs font-medium tracking-wide text-slate-500">维保概况</Typography.Text>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
              <KpiCard title="今日维保" value={overview?.kpis.maintenance.todayCount ?? 0} valueStyle={{ fontSize: "20px" }} />
              <KpiCard title="本周维保" value={overview?.kpis.maintenance.weekCount ?? 0} valueStyle={{ fontSize: "20px" }} />
              <KpiCard title="本月维保单数" value={overview?.kpis.maintenance.monthCount ?? 0} valueStyle={{ fontSize: "20px" }} />
              <KpiCard
                title="本月维保费用"
                value={overview?.kpis.maintenance.monthCost ?? 0}
                valueStyle={{ fontSize: "20px", color: "#2563eb" }}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className={dashTwoColGridClass}>
        {/* 到期预警中心 */}
        <Card
          title={dashCardTitle("到期预警中心")}
          className={dashCardClass}
          headClassName={dashHeadClass}
          bodyClassName={dashBodyClass}
        >
          {alerts.length === 0 ? (
            <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              暂无到期预警
            </div>
          ) : (
            <Space direction="vertical" className="w-full" size="middle">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "all" as const, label: `全部（${alerts.length}）` },
                    { key: "expired" as const, label: `仅逾期（${overview?.kpis.alerts.expired ?? 0}）` },
                    { key: "within7" as const, label: `7天内（${overview?.kpis.alerts.within7 ?? 0}）` },
                    { key: "within30" as const, label: `30天内（${overview?.kpis.alerts.within30 ?? 0}）` },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.key}
                    size="small"
                    className={`h-6 rounded-[6px] px-2 text-xs ${
                      alertLevelFilter === opt.key
                        ? "border border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setAlertLevelFilter(opt.key);
                      setShowAllAlerts(false);
                    }}
                  >
                    <span className="tabular-nums">{opt.label}</span>
                  </Button>
                ))}
              </div>
              {filteredAlerts.length > 0 ? (
                <div className="text-xs text-slate-500">
                  共 <span className="tabular-nums font-medium text-slate-700">{filteredAlerts.length}</span> 条
                  {filteredAlerts.length > DASH_ALERT_PREVIEW_COUNT && !showAllAlerts
                    ? `，当前展示前 ${DASH_ALERT_PREVIEW_COUNT} 条`
                    : ""}
                </div>
              ) : null}
              {filteredAlerts.length === 0 && alerts.length > 0 ? (
                <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  当前筛选下无到期预警，可切换上方筛选或选择「全部」。
                </div>
              ) : (
              <List
                size="small"
                className={`${DASH_CONTENT_PANEL_CLASS} ${DASH_ALERT_LIST_HEIGHT} overflow-y-auto`}
                dataSource={visibleAlerts}
                renderItem={(a) => (
                  <AlertItemComponent
                    key={a.alertKey}
                    item={a}
                    onAction={() => openAlertAction(a)}
                  />
                )}
              />
              )}
              {filteredAlerts.length > DASH_ALERT_PREVIEW_COUNT ? (
                <div className="flex justify-end">
                  <Button
                    size="small"
                    className="h-6 rounded-[6px] border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50"
                    onClick={() => setShowAllAlerts((v) => !v)}
                  >
                    {showAllAlerts ? "收起" : `查看更多（${filteredAlerts.length}）`}
                  </Button>
                </div>
              ) : null}
            </Space>
          )}
        </Card>

        {/* 待处理预警 */}
        <Card
          title={dashCardTitle("待处理预警")}
          className={dashCardClass}
          headClassName={dashHeadClass}
          bodyClassName={dashBodyClass}
        >
          {pendingAlerts.length === 0 ? (
            <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              暂无待处理预警
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "all" as const, label: `全部（${pendingAlerts.length}）` },
                    { key: "open" as const, label: `待处理（${pendingOpenCount}）` },
                    { key: "processing" as const, label: `处理中（${pendingProcessingCount}）` },
                    { key: "resolved" as const, label: `已处理（${pendingResolvedCount}）` },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.key}
                    size="small"
                    className={`h-6 rounded-[6px] px-2 text-xs ${
                      pendingStatusFilter === opt.key
                        ? "border border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setPendingStatusFilter(opt.key);
                      setShowAllPendingAlerts(false);
                    }}
                  >
                    <span className="tabular-nums">{opt.label}</span>
                  </Button>
                ))}
              </div>
              {filteredPendingAlerts.length > 0 ? (
                <div className="text-xs text-slate-500">
                  共 <span className="tabular-nums font-medium text-slate-700">{filteredPendingAlerts.length}</span> 条
                  {filteredPendingAlerts.length > DASH_ALERT_PREVIEW_COUNT && !showAllPendingAlerts
                    ? `，当前展示前 ${DASH_ALERT_PREVIEW_COUNT} 条`
                    : ""}
                </div>
              ) : null}
              {filteredPendingAlerts.length === 0 && pendingAlerts.length > 0 ? (
                <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  当前筛选下无待处理预警，可切换上方筛选或选择「全部」。
                </div>
              ) : (
              <List
                size="small"
                className={`${DASH_CONTENT_PANEL_CLASS} ${DASH_ALERT_LIST_HEIGHT} overflow-y-auto`}
                dataSource={visiblePendingAlerts}
                renderItem={(a) => (
                  <PendingAlertItem
                    key={a.alertKey}
                    item={{ ...(a as any), actionStatusLabels }}
                    canHandleAlerts={canHandleAlerts}
                    onUpdateStatus={(status) => updateAlertStatus(a.alertKey, status)}
                  />
                )}
              />
              )}
              {filteredPendingAlerts.length > DASH_ALERT_PREVIEW_COUNT ? (
                <div className="mt-2 flex justify-end">
                  <Button
                    size="small"
                    className="h-6 rounded-[6px] border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50"
                    onClick={() => setShowAllPendingAlerts((v) => !v)}
                  >
                    {showAllPendingAlerts ? "收起" : `查看更多（${filteredPendingAlerts.length}）`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>

      <div className={dashTwoColGridClass}>
        <Card
          title={dashCardTitle("近一年高成本车辆 TOP5")}
          className={dashCardClass}
          headClassName={dashHeadClass}
          bodyClassName={dashBodyClass}
        >
          {topCostVehicles.length === 0 ? (
            <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
              <div className="mb-3">
                近一年暂无足够维保费用数据，录入维保后可在此查看排名。
              </div>
              <Button
                size="small"
                className="h-7 rounded-[6px] border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm shadow-slate-900/5 hover:bg-slate-50"
                onClick={() => nav("/maintenance/vehicles")}
              >
                去车辆维保
              </Button>
            </div>
          ) : (
            <div className={`${DASH_CONTENT_PANEL_CLASS} ${DASH_ALERT_LIST_HEIGHT} overflow-auto`}>
              <Table
                className="ve-dash-table"
                size="small"
                pagination={false}
                scroll={cardTableScroll}
                sticky={cardTableSticky}
                rowKey={(r) => `${r.plateNo}-${r.totalCost}`}
                dataSource={topCostVehicles}
                onRow={(r) => ({
                  onClick: () => goVehicles({ q: r.plateNo }),
                  className: "hover:bg-slate-100/80",
                })}
                columns={[
                  {
                    title: "",
                    key: "rank",
                    width: 44,
                    className: "text-center",
                    render: (_v, _r, idx) => (
                      <span className="tabular-nums text-xs font-medium text-slate-400">#{idx + 1}</span>
                    ),
                  },
                  {
                    title: "车辆",
                    render: (_, r) => (
                      <div
                        className="max-w-[200px] truncate font-medium text-slate-900 sm:max-w-none"
                        title={r.plateNo}
                      >
                        {r.plateNo}
                      </div>
                    ),
                  },
                  {
                    title: "次数",
                    dataIndex: "recordCount",
                    width: 80,
                    render: (v) => <span className="tabular-nums">{Number(v ?? 0)}</span>,
                    className: "text-center",
                  },
                  {
                    title: "费用",
                    dataIndex: "totalCost",
                    width: 120,
                    render: (v) => (
                      <span className="tabular-nums font-medium text-slate-900">¥{Number(v ?? 0).toFixed(0)}</span>
                    ),
                    className: "text-right",
                  },
                ]}
              />
            </div>
          )}
        </Card>

        {/* 高频维保项目 */}
        <Card
          title={dashCardTitle("近一年高频维保项目 TOP5")}
          className={dashCardClass}
          headClassName={dashHeadClass}
          bodyClassName={dashBodyClass}
        >
          {topMaintenanceItems.length === 0 ? (
            <div className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
              <div className="mb-3">
                近一年暂无高频项目统计，可先录入几条维保记录。
              </div>
              <Button
                size="small"
                className="h-7 rounded-[6px] border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm shadow-slate-900/5 hover:bg-slate-50"
                onClick={() => nav("/maintenance/vehicles")}
              >
                去车辆维保
              </Button>
            </div>
          ) : (
            <div className={`${DASH_CONTENT_PANEL_CLASS} ${DASH_ALERT_LIST_HEIGHT} overflow-auto`}>
              <Table
                className="ve-dash-table"
                size="small"
                pagination={false}
                scroll={cardTableScroll}
                sticky={cardTableSticky}
                rowKey={(r) => `${r.itemDesc}-${r.recordCount}`}
                dataSource={topMaintenanceItems}
                onRow={(r) => ({
                  onClick: () => goMaintenanceVehiclesSearch(String(r.itemDesc ?? "")),
                  className: "hover:bg-slate-100/80",
                })}
                columns={[
                  {
                    title: "",
                    key: "rank",
                    width: 44,
                    className: "text-center",
                    render: (_v, _r, idx) => (
                      <span className="tabular-nums text-xs font-medium text-slate-400">#{idx + 1}</span>
                    ),
                  },
                  {
                    title: "项目",
                    dataIndex: "itemDesc",
                    render: (v) => (
                      <span className="block max-w-[220px] truncate font-medium text-slate-900" title={String(v ?? "-")}>
                        {String(v ?? "-")}
                      </span>
                    ),
                  },
                  {
                    title: "次数",
                    dataIndex: "recordCount",
                    width: 100,
                    render: (v) => <span className="tabular-nums">{Number(v ?? 0)}</span>,
                    className: "text-center",
                  },
                  {
                    title: "费用",
                    dataIndex: "totalCost",
                    width: 140,
                    render: (v) => (
                      <span className="tabular-nums font-medium text-slate-900">¥{Number(v ?? 0).toFixed(0)}</span>
                    ),
                    className: "text-right",
                  },
                ]}
              />
            </div>
          )}
        </Card>
      </div>

      {/* 全局搜索 */}
      <Card
        title={dashCardTitle("全局搜索")}
        className={dashCardClass}
        headClassName={dashHeadClass}
        bodyClassName={dashBodyClass}
      >
        <Input.Search
          placeholder="输入车牌、项目、设备名称"
          value={searchInput}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
          onSearch={(q) => {
            const v = String(q ?? "");
            const trimmed = v.trim();
            setSearchInput(trimmed === "" ? "" : trimmed);
            commitDashboardSearch(v);
          }}
          allowClear
          size="large"
          className="rounded-[6px]"
          aria-label="仪表盘全局搜索"
          aria-describedby={searchHintId}
        />
        <p id={searchHintId} className="mt-1.5 text-xs leading-relaxed text-slate-500">
          按回车或点击「搜索」查找；点输入框内 × 清空关键词并清除结果。移动端同样可用。
        </p>
        {searchHistory.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">最近搜索：</span>
            {searchHistory.map((h) => (
              <button
                key={h}
                type="button"
                className="h-6 max-w-[200px] truncate rounded-[6px] border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                title={h}
                aria-label={`使用关键词「${h}」搜索`}
                onClick={() => {
                  setSearchInput(h);
                  commitDashboardSearch(h);
                }}
              >
                {h}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500">车辆结果</div>
          <List
            size="small"
            bordered
            className="overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
            dataSource={search.vehicles}
            renderItem={(v) => (
              <List.Item
                className="cursor-pointer px-3 py-2 transition-colors hover:bg-slate-50"
                role="button"
                tabIndex={0}
                onClick={() => goVehicles({ q: v.plateNo })}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goVehicles({ q: v.plateNo });
                  }
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-slate-900">{v.plateNo}</div>
                  <div className="text-xs text-slate-500">{v.brandModel}</div>
                </div>
              </List.Item>
            )}
          />
          {search.vehicles.length === 0 ? (
            <div className="mt-2 text-xs text-slate-500">暂无结果</div>
          ) : null}
        </div>
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500">维保结果</div>
          <List
            size="small"
            bordered
            className="overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
            dataSource={search.maintenance}
            renderItem={(m) => (
              <List.Item
                className="cursor-pointer px-3 py-2 transition-colors hover:bg-slate-50"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (m.plateNo) {
                    goVehicles({ q: m.plateNo });
                    return;
                  }
                  toast.message("该维保记录无关联车辆，无法定位到车辆列表。");
                }}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  if (m.plateNo) {
                    goVehicles({ q: m.plateNo });
                    return;
                  }
                  toast.message("该维保记录无关联车辆，无法定位到车辆列表。");
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-medium text-slate-900">{m.itemDesc}</div>
                  <div className="text-xs text-slate-500">
                    {m.plateNo ? `车辆: ${m.plateNo}` : m.equipmentName ? `设备: ${m.equipmentName}` : "无关联信息"}
                  </div>
                </div>
              </List.Item>
            )}
          />
          {search.maintenance.length === 0 ? (
            <div className="mt-2 text-xs text-slate-500">暂无结果</div>
          ) : null}
        </div>
      </Card>
    </div>
      )}
    </PageContainer>
  );
}

