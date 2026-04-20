import { Alert, Button, Card, Col, Input, List, Progress, Row, Skeleton, Space, Statistic, Table, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/PageContainer";
import { KpiCard } from "../components/KpiCard";
import { cardTableScroll, cardTableSticky } from "../lib/tableConfig";
import { AlertItem as AlertItemComponent } from "../components/AlertItem";
import { PendingAlertItem } from "../components/PendingAlertItem";
import type { DashboardAlertItem } from "../hooks/useDashboardOverview";
import { useDashboardOverview } from "../hooks/useDashboardOverview";

export function DashboardPage({ canHandleAlerts = false }: { canHandleAlerts?: boolean }) {
  const nav = useNavigate();
  const { overview, search, loading, lastUpdated, loadOverview, runSearch, updateAlertStatus, trendSummary } = useDashboardOverview();

  const alerts = overview?.alerts ?? [];
  const pendingAlerts = overview?.pendingAlerts ?? [];
  const goVehicles = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    nav(`/vehicles?${sp.toString()}`);
  };
  const openAlertAction = (a: DashboardAlertItem) => {
    if (a.type === "保险" || a.type === "年审" || a.type === "保养日期") {
      goVehicles({ q: a.plateNo, due: a.level === "expired" ? "overdue" : a.level });
      return;
    }
    goVehicles({ q: a.plateNo });
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
      <div className="w-full ve-dashboard space-y-6">
      {/* Bento：核心 KPI 栅格（12 列） */}
      <Card
        title={<span className="ve-card-title">实时数据概览</span>}
        className="ve-dash-card ve-dash-overview-card transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-card-lg"
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
        <div className="space-y-6">
          <div>
            <Typography.Text className="mb-3 block text-xs font-medium uppercase tracking-wide text-[#64748B]">车辆概况</Typography.Text>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
              <div className="col-span-2 lg:col-span-5">
                <KpiCard
                  title="车辆总数"
                  value={overview?.kpis.vehicles.total ?? 0}
                  valueStyle={{ fontSize: "26px", fontWeight: "600" }}
                  onClick={() => goVehicles({})}
                />
              </div>
              <div className="col-span-2 lg:col-span-7">
                <div className="grid h-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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
            <Typography.Text className="mb-3 block text-xs font-medium uppercase tracking-wide text-[#64748B]">维保概况</Typography.Text>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              <KpiCard title="今日维保" value={overview?.kpis.maintenance.todayCount ?? 0} valueStyle={{ fontSize: "20px" }} />
              <KpiCard title="本周维保" value={overview?.kpis.maintenance.weekCount ?? 0} valueStyle={{ fontSize: "20px" }} />
              <KpiCard title="本月维保单数" value={overview?.kpis.maintenance.monthCount ?? 0} valueStyle={{ fontSize: "20px" }} />
              <KpiCard
                title="本月维保费用"
                value={overview?.kpis.maintenance.monthCost ?? 0}
                valueStyle={{ fontSize: "20px", color: "#1677ff" }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 到期预警中心 */}
      <Card
        title={<span className="ve-card-title">到期预警中心</span>}
        className="ve-dash-card ve-dash-alert-card transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-card-lg"
      >
        {alerts.length === 0 ? (
          <Alert type="success" showIcon message="暂无到期预警" className="ve-empty-alert" />
        ) : (
          <Space direction="vertical" className="w-full" size="middle">
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={8}>
                <Card size="small" className="ve-alert-stat-card transition-transform duration-200 ease-out hover:scale-[1.02]">
                  <Statistic 
                    title="已逾期" 
                    value={overview?.kpis.alerts.expired ?? 0} 
                    valueStyle={{ color: "#dc2626" }} 
                  />
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small" className="ve-alert-stat-card transition-transform duration-200 ease-out hover:scale-[1.02]">
                  <Statistic 
                    title="7天内" 
                    value={overview?.kpis.alerts.within7 ?? 0} 
                    valueStyle={{ color: "#d97706" }} 
                  />
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small" className="ve-alert-stat-card transition-transform duration-200 ease-out hover:scale-[1.02]">
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
        className="ve-dash-card ve-dash-pending-card transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-card-lg"
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
                  onUpdateStatus={(status) => updateAlertStatus(a.alertKey, status)}
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
            className="ve-dash-card ve-dash-trend-card transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-card-lg"
          >
            <Space direction="vertical" className="w-full" size="large">
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Card size="small" className="ve-trend-stat-card transition-transform duration-200 ease-out hover:scale-[1.02]">
                    <Statistic 
                      title="近30天维保单数" 
                      value={trendSummary.totalCount} 
                      valueStyle={{ fontSize: '20px' }}
                    />
                  </Card>
                </Col>
                <Col xs={12}>
                  <Card size="small" className="ve-trend-stat-card ve-trend-stat-cost transition-transform duration-200 ease-out hover:scale-[1.02]">
                    <Statistic 
                      title="近30天维保费用" 
                      value={trendSummary.totalCost} 
                      precision={2} 
                      valueStyle={{ fontSize: '20px', color: '#1677ff' }}
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
            className="ve-dash-card ve-dash-ranking-card transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-card-lg"
          >
            <Table
              className="ve-dash-table ve-ranking-table"
              size="small"
              pagination={false}
              scroll={cardTableScroll}
              sticky={cardTableSticky}
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

      {/* 高频维保项目 */}
      <Card
        title={<span className="ve-card-title">高频维保项目 TOP5</span>}
        className="ve-dash-card ve-dash-top-items-card transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-card-lg"
      >
        <Table
          className="ve-dash-table ve-top-items-table"
          size="small"
          pagination={false}
          scroll={cardTableScroll}
          sticky={cardTableSticky}
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
        className="ve-dash-card ve-dash-search-card transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-card-lg"
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
      )}
    </PageContainer>
  );
}

