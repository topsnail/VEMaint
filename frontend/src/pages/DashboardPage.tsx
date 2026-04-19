import { Alert, Button, Card, Col, Input, List, Progress, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import { useEffect, useMemo, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/http";
import { REFRESH_INTERVALS, SEARCH_CONFIG } from "../lib/config";
import { handleApiError } from "../lib/errorHandler";
import { KpiCard } from "../components/KpiCard";
import { AlertItem as AlertItemComponent, type AlertItemType } from "../components/AlertItem";
import { PendingAlertItem } from "../components/PendingAlertItem";
import type { MaintenanceRecord, Vehicle } from "../types";

type AlertItem = {
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

type SearchResult = {
  vehicles: Array<{ id: string; plateNo: string; brandModel: string }>;
  maintenance: Array<{ id: string; itemDesc: string; plateNo: string | null; equipmentName: string | null }>;
};

type DashboardOverview = {
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
  alerts: AlertItem[];
  pendingAlerts: AlertItem[];
  trends: Array<{ day: string; count: number; cost: number }>;
  responsibility: {
    byDept: Array<{ ownerDept: string; expired: number; within7: number; within30: number; pending: number; monthCost: number }>;
    byPerson: Array<{ ownerPerson: string; expired: number; within7: number; within30: number; pending: number; monthCost: number }>;
  };
  rankings: {
    topCostVehicles: Array<{ vehicleId: string | null; plateNo: string; brandModel: string; recordCount: number; totalCost: number }>;
    topItems: Array<{ itemDesc: string; recordCount: number; totalCost: number }>;
  };
};

export function DashboardPage({ canHandleAlerts = false }: { canHandleAlerts?: boolean }) {
  const nav = useNavigate();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [search, setSearch] = useState<SearchResult>({ vehicles: [], maintenance: [] });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadOverview = async () => {
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
  };

  useEffect(() => {
    loadOverview();
    
    // 优化数据刷新策略
    let timer: NodeJS.Timeout;
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
    
    // 初始加载后，设置定时器
    timer = setInterval(refreshData, REFRESH_INTERVALS.DASHBOARD); // 使用配置的刷新间隔
    
    // 监听页面可见性变化，当页面从隐藏变为可见时刷新数据
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 添加防抖处理
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  
  const runSearch = async (q: string) => {
    const key = q.trim();
    if (!key) return setSearch({ vehicles: [], maintenance: [] });
    
    // 清除之前的定时器
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    
    // 设置新的定时器，实现防抖
    const timer = setTimeout(async () => {
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
    }, SEARCH_CONFIG.DEBOUNCE_DELAY); // 使用配置的防抖延迟
    
    setSearchTimer(timer);
  };

  const trendSummary = useMemo(() => {
    const data = overview?.trends ?? [];
    const totalCost = data.reduce((sum, x) => sum + Number(x.cost || 0), 0);
    const totalCount = data.reduce((sum, x) => sum + Number(x.count || 0), 0);
    return { totalCost, totalCount };
  }, [overview]);

  const alerts = overview?.alerts ?? [];
  const pendingAlerts = overview?.pendingAlerts ?? [];
  const goVehicles = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    nav(`/vehicles?${sp.toString()}`);
  };
  const openAlertAction = (a: AlertItem) => {
    if (a.type === "保险" || a.type === "年审" || a.type === "保养日期") {
      goVehicles({ q: a.plateNo, due: a.level === "expired" ? "overdue" : a.level });
      return;
    }
    goVehicles({ q: a.plateNo });
  };
  const updateAlertStatus = async (a: AlertItem, status: "open" | "processing" | "resolved") => {
    try {
      const res = await apiFetch<{ ok: true }>(`/dashboard/alerts/${encodeURIComponent(a.alertKey)}/action`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await loadOverview();
      } else {
        handleApiError(res);
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <div className="w-full ve-dashboard space-y-6">
      {/* 顶部概览卡片 */}
      <Card
        title={<span className="ve-card-title">实时数据概览</span>}
        className="ve-dash-card ve-dash-overview-card"
        extra={
          <Space size="middle">
            <Typography.Text type="secondary" className="text-sm">
              {lastUpdated ? `更新时间：${lastUpdated}` : "初始化中"}
            </Typography.Text>
            <Button size="small" onClick={loadOverview} loading={loading} className="ve-refresh-btn">
              刷新
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <KpiCard 
              title="车辆总数" 
              value={overview?.kpis.vehicles.total ?? 0} 
              valueStyle={{ fontSize: '24px', fontWeight: '600' }}
              onClick={() => goVehicles({})}
            />
          </Col>
          <Col xs={12} md={6}>
            <KpiCard 
              title="正常车辆" 
              value={overview?.kpis.vehicles.normal ?? 0} 
              valueStyle={{ color: "#16a34a", fontSize: '24px', fontWeight: '600' }}
              onClick={() => goVehicles({ status: "normal" })}
            />
          </Col>
          <Col xs={12} md={6}>
            <KpiCard 
              title="维修中" 
              value={overview?.kpis.vehicles.repairing ?? 0} 
              valueStyle={{ color: "#d97706", fontSize: '24px', fontWeight: '600' }}
              onClick={() => goVehicles({ status: "repairing" })}
            />
          </Col>
          <Col xs={12} md={6}>
            <KpiCard 
              title="停用/报废" 
              value={(overview?.kpis.vehicles.stopped ?? 0) + (overview?.kpis.vehicles.scrapped ?? 0)} 
              valueStyle={{ color: "#dc2626", fontSize: '24px', fontWeight: '600' }}
              onClick={() => goVehicles({ status: "stopped" })}
            />
          </Col>
          <Col xs={12} md={6}>
            <KpiCard 
              title="今日维保" 
              value={overview?.kpis.maintenance.todayCount ?? 0} 
              valueStyle={{ fontSize: '20px' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <KpiCard 
              title="本周维保" 
              value={overview?.kpis.maintenance.weekCount ?? 0} 
              valueStyle={{ fontSize: '20px' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <KpiCard 
              title="本月维保单数" 
              value={overview?.kpis.maintenance.monthCount ?? 0} 
              valueStyle={{ fontSize: '20px' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <KpiCard 
              title="本月维保费用" 
              value={overview?.kpis.maintenance.monthCost ?? 0} 
              valueStyle={{ fontSize: '20px', color: '#3b82f6' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 到期预警中心 */}
      <Card 
        title={<span className="ve-card-title">到期预警中心</span>} 
        className="ve-dash-card ve-dash-alert-card"
      >
        {alerts.length === 0 ? (
          <Alert type="success" showIcon message="暂无到期预警" className="ve-empty-alert" />
        ) : (
          <Space direction="vertical" className="w-full" size="middle">
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={8}>
                <Card size="small" className="ve-alert-stat-card">
                  <Statistic 
                    title="已逾期" 
                    value={overview?.kpis.alerts.expired ?? 0} 
                    valueStyle={{ color: "#dc2626" }} 
                  />
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small" className="ve-alert-stat-card">
                  <Statistic 
                    title="7天内" 
                    value={overview?.kpis.alerts.within7 ?? 0} 
                    valueStyle={{ color: "#d97706" }} 
                  />
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small" className="ve-alert-stat-card">
                  <Statistic 
                    title="30天内" 
                    value={overview?.kpis.alerts.within30 ?? 0} 
                    valueStyle={{ color: "#ca8a04" }} 
                  />
                </Card>
              </Col>
            </Row>
            <List
              size="small"
              className="ve-alert-list"
              dataSource={alerts.slice(0, 15)}
              renderItem={(a) => (
                <AlertItemComponent 
                  key={a.alertKey}
                  item={a} 
                  onAction={() => openAlertAction(a)}
                />
              )}
            />
          </Space>
        )}
      </Card>

      {/* 待处理预警 */}
      <Card 
        title={<span className="ve-card-title">待处理预警</span>} 
        className="ve-dash-card ve-dash-pending-card"
      >
        {pendingAlerts.length === 0 ? (
          <Alert type="success" showIcon message="暂无待处理预警" className="ve-empty-alert" />
        ) : (
          <List
              size="small"
              className="ve-pending-list"
              dataSource={pendingAlerts}
              renderItem={(a) => (
                <PendingAlertItem 
                  key={a.alertKey}
                  item={a} 
                  canHandleAlerts={canHandleAlerts}
                  onUpdateStatus={(status) => updateAlertStatus(a, status)}
                />
              )}
            />
        )}
      </Card>

      {/* 趋势和高成本车辆 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span className="ve-card-title">近30天维保趋势</span>} 
            className="ve-dash-card ve-dash-trend-card"
          >
            <Space direction="vertical" className="w-full" size="large">
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Card size="small" className="ve-trend-stat-card">
                    <Statistic 
                      title="近30天维保单数" 
                      value={trendSummary.totalCount} 
                      valueStyle={{ fontSize: '20px' }}
                    />
                  </Card>
                </Col>
                <Col xs={12}>
                  <Card size="small" className="ve-trend-stat-card ve-trend-stat-cost">
                    <Statistic 
                      title="近30天维保费用" 
                      value={trendSummary.totalCost} 
                      precision={2} 
                      valueStyle={{ fontSize: '20px', color: '#3b82f6' }}
                    />
                  </Card>
                </Col>
              </Row>
              <div className="ve-trend-chart">
                {(overview?.trends ?? []).slice(-7).map((row) => (
                  <div key={row.day} className="ve-trend-item">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="ve-trend-date">{row.day}</span>
                      <span className="ve-trend-value">{row.count} 单 / {row.cost.toFixed(0)} 元</span>
                    </div>
                    <Progress 
                      percent={Math.min(100, Math.round((row.count / Math.max(1, trendSummary.totalCount)) * 1000)) / 10} 
                      showInfo={false}
                      className="ve-trend-progress"
                    />
                  </div>
                ))}
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={<span className="ve-card-title">高成本车辆 TOP5</span>} 
            className="ve-dash-card ve-dash-ranking-card"
          >
            <Table
              className="ve-dash-table ve-ranking-table"
              size="small"
              pagination={false}
              rowKey={(r) => `${r.plateNo}-${r.totalCost}`}
              dataSource={overview?.rankings.topCostVehicles ?? []}
              columns={[
                { 
                  title: "车辆", 
                  render: (_, r) => (
                    <div className="ve-vehicle-info">
                      <div className="ve-vehicle-plate">{r.plateNo}</div>
                      <div className="ve-vehicle-model text-sm text-slate-500">{r.brandModel}</div>
                    </div>
                  ) 
                },
                { 
                  title: "次数", 
                  dataIndex: "recordCount", 
                  width: 80,
                  className: "text-center"
                },
                { 
                  title: "费用", 
                  dataIndex: "totalCost", 
                  width: 120, 
                  render: (v) => (
                    <span className="ve-cost-value">¥{Number(v ?? 0).toFixed(0)}</span>
                  ),
                  className: "text-right"
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* 责任维度 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span className="ve-card-title">责任维度（部门）</span>} 
            className="ve-dash-card ve-dash-responsibility-card"
          >
            <Table
              className="ve-dash-table ve-responsibility-table"
              size="small"
              pagination={false}
              rowKey={(r) => r.ownerDept}
              dataSource={overview?.responsibility.byDept ?? []}
              columns={[
                { title: "部门", dataIndex: "ownerDept" },
                { 
                  title: "待处理", 
                  dataIndex: "pending", 
                  width: 90,
                  className: "text-center"
                },
                { 
                  title: "逾期", 
                  dataIndex: "expired", 
                  width: 80,
                  className: "text-center ve-danger-text"
                },
                { 
                  title: "7天内", 
                  dataIndex: "within7", 
                  width: 80,
                  className: "text-center ve-warning-text"
                },
                { 
                  title: "本月费用", 
                  dataIndex: "monthCost", 
                  width: 120, 
                  render: (v) => (
                    <span className="ve-cost-value">¥{Number(v ?? 0).toFixed(0)}</span>
                  ),
                  className: "text-right"
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={<span className="ve-card-title">责任维度（责任人）</span>} 
            className="ve-dash-card ve-dash-responsibility-card"
          >
            <Table
              className="ve-dash-table ve-responsibility-table"
              size="small"
              pagination={false}
              rowKey={(r) => r.ownerPerson}
              dataSource={overview?.responsibility.byPerson ?? []}
              columns={[
                { title: "责任人", dataIndex: "ownerPerson" },
                { 
                  title: "待处理", 
                  dataIndex: "pending", 
                  width: 90,
                  className: "text-center"
                },
                { 
                  title: "逾期", 
                  dataIndex: "expired", 
                  width: 80,
                  className: "text-center ve-danger-text"
                },
                { 
                  title: "7天内", 
                  dataIndex: "within7", 
                  width: 80,
                  className: "text-center ve-warning-text"
                },
                { 
                  title: "本月费用", 
                  dataIndex: "monthCost", 
                  width: 120, 
                  render: (v) => (
                    <span className="ve-cost-value">¥{Number(v ?? 0).toFixed(0)}</span>
                  ),
                  className: "text-right"
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* 高频维保项目 */}
      <Card 
        title={<span className="ve-card-title">高频维保项目 TOP5</span>} 
        className="ve-dash-card ve-dash-top-items-card"
      >
        <Table
          className="ve-dash-table ve-top-items-table"
          size="small"
          pagination={false}
          rowKey={(r) => `${r.itemDesc}-${r.recordCount}`}
          dataSource={overview?.rankings.topItems ?? []}
          columns={[
            { 
              title: "项目", 
              dataIndex: "itemDesc",
              className: "ve-item-desc"
            },
            { 
              title: "次数", 
              dataIndex: "recordCount", 
              width: 100,
              className: "text-center"
            },
            { 
              title: "费用", 
              dataIndex: "totalCost", 
              width: 140, 
              render: (v) => (
                <span className="ve-cost-value">¥{Number(v ?? 0).toFixed(0)}</span>
              ),
              className: "text-right"
            },
          ]}
        />
      </Card>

      {/* 全局搜索 */}
      <Card 
        title={<span className="ve-card-title">全局搜索</span>} 
        className="ve-dash-card ve-dash-search-card"
      >
        <Input.Search 
          placeholder="输入车牌、项目、设备名称" 
          onSearch={runSearch} 
          allowClear
          size="large"
          className="ve-search-input"
        />
        <div className="mt-4">
          <div className="mb-2 font-medium ve-search-section-title">车辆结果</div>
          <List
            size="small"
            bordered
            className="ve-search-results"
            dataSource={search.vehicles}
            renderItem={(v) => (
              <List.Item className="ve-search-item">
                <div className="ve-vehicle-search-info">
                  <div className="ve-vehicle-search-plate font-medium">{v.plateNo}</div>
                  <div className="ve-vehicle-search-model text-sm text-slate-500">{v.brandModel}</div>
                </div>
              </List.Item>
            )}
          />
        </div>
        <div className="mt-4">
          <div className="mb-2 font-medium ve-search-section-title">维保结果</div>
          <List
            size="small"
            bordered
            className="ve-search-results"
            dataSource={search.maintenance}
            renderItem={(m) => (
              <List.Item className="ve-search-item">
                <div className="ve-maintenance-search-info">
                  <div className="ve-maintenance-search-desc font-medium">{m.itemDesc}</div>
                  <div className="ve-maintenance-search-detail text-sm text-slate-500">
                    {m.plateNo ? `车辆: ${m.plateNo}` : m.equipmentName ? `设备: ${m.equipmentName}` : "无关联信息"}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Card>
    </div>
  );
}

