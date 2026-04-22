import { Button, Card, Col, Input, List, Progress, Row, Skeleton, Space, Statistic, Table, Typography } from "@/components/ui/legacy";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageContainer } from "../components/PageContainer";
import { KpiCard } from "../components/KpiCard";
import { cardTableScroll, cardTableSticky } from "../lib/tableConfig";
import { AlertItem as AlertItemComponent } from "../components/AlertItem";
import { PendingAlertItem } from "../components/PendingAlertItem";
import type { DashboardAlertItem } from "../hooks/useDashboardOverview";
import { useDashboardOverview } from "../hooks/useDashboardOverview";

const dashCardClass =
  "rounded-[6px] border border-slate-200 bg-white shadow-sm shadow-slate-900/5";

const dashCardTitle = (text: string) => (
  <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{text}</span>
);

const dashHeadClass = "min-h-11 px-3 py-1.5";
const dashBodyClass = "p-2.5";

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
            <div className="mb-2.5 grid grid-cols-3 gap-2.5">
              <Card size="small" className={dashCardClass} bodyClassName="p-1.5">
                <Statistic
                  title="已逾期"
                  value={overview?.kpis.alerts.expired ?? 0}
                  valueStyle={{ color: "#dc2626" }}
                />
              </Card>
              <Card size="small" className={dashCardClass} bodyClassName="p-1.5">
                <Statistic
                  title="7天内"
                  value={overview?.kpis.alerts.within7 ?? 0}
                  valueStyle={{ color: "#d97706" }}
                />
              </Card>
              <Card size="small" className={dashCardClass} bodyClassName="p-1.5">
                <Statistic
                  title="30天内"
                  value={overview?.kpis.alerts.within30 ?? 0}
                  valueStyle={{ color: "#ca8a04" }}
                />
              </Card>
            </div>
            <List
              size="small"
              className="overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
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
          <List
              size="small"
              className="overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
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
            title={dashCardTitle("近30天维保趋势")}
            className={dashCardClass}
            headClassName={dashHeadClass}
            bodyClassName={dashBodyClass}
          >
            <Space direction="vertical" className="w-full" size="middle">
              <Row gutter={[10, 10]}>
                <Col xs={12}>
                  <Card size="small" className={dashCardClass} bodyClassName="p-2">
                    <Statistic 
                      title="近30天维保单数" 
                      value={trendSummary.totalCount} 
                      valueStyle={{ fontSize: '20px' }}
                    />
                  </Card>
                </Col>
                <Col xs={12}>
                  <Card size="small" className={dashCardClass} bodyClassName="p-2">
                    <Statistic 
                      title="近30天维保费用" 
                      value={trendSummary.totalCost} 
                      precision={2} 
                      valueStyle={{ fontSize: '20px', color: '#2563eb' }}
                    />
                  </Card>
                </Col>
              </Row>
              <div className="space-y-2.5">
                {(overview?.trends ?? []).slice(-7).map((row) => (
                  <div key={row.day}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-500">{row.day}</span>
                      <span className="tabular-nums font-medium text-slate-700">{row.count} 单 / {row.cost.toFixed(0)} 元</span>
                    </div>
                    <Progress 
                      percent={Math.min(100, Math.round((row.count / Math.max(1, trendSummary.totalCount)) * 1000)) / 10} 
                      showInfo={false}
                      className="h-1.5 rounded-full bg-slate-100"
                    />
                  </div>
                ))}
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={dashCardTitle("高成本车辆 TOP5")}
            className={dashCardClass}
            headClassName={dashHeadClass}
            bodyClassName={dashBodyClass}
          >
            <Table
              className="ve-dash-table"
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
                    <div className="flex flex-col gap-0.5">
                      <div className="font-medium text-slate-900">{r.plateNo}</div>
                      <div className="text-xs text-slate-500">{r.brandModel}</div>
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
                    <span className="tabular-nums font-medium text-slate-900">¥{Number(v ?? 0).toFixed(0)}</span>
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
        title={dashCardTitle("高频维保项目 TOP5")}
        className={dashCardClass}
        headClassName={dashHeadClass}
        bodyClassName={dashBodyClass}
      >
        <Table
          className="ve-dash-table"
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
              render: (v) => <span className="font-medium text-slate-900">{String(v ?? "-")}</span>
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
                <span className="tabular-nums font-medium text-slate-900">¥{Number(v ?? 0).toFixed(0)}</span>
              ),
              className: "text-right"
            },
          ]}
        />
      </Card>

      {/* 全局搜索 */}
      <Card
        title={dashCardTitle("全局搜索")}
        className={dashCardClass}
        headClassName={dashHeadClass}
        bodyClassName={dashBodyClass}
      >
        <Input.Search 
          placeholder="输入车牌、项目、设备名称" 
          onSearch={runSearch} 
          allowClear
          size="large"
          className="rounded-[6px]"
        />
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
                onClick={() => goVehicles({ q: v.plateNo })}
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
                onClick={() => {
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

