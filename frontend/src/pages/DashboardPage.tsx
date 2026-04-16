import { Alert, Card, Input, List, Space, Tag } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/http";

type AlertItem = {
  type: string;
  level: "soon" | "expired";
  days?: number;
  kmLeft?: number;
  vehicleId: string;
  plateNo: string;
};

type SearchResult = {
  vehicles: Array<{ id: string; plateNo: string; brandModel: string }>;
  maintenance: Array<{ id: string; itemDesc: string; plateNo: string | null; equipmentName: string | null }>;
};

export function DashboardPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [search, setSearch] = useState<SearchResult>({ vehicles: [], maintenance: [] });

  useEffect(() => {
    apiFetch<{ alerts: AlertItem[] }>("/alerts").then((res) => {
      if (res.ok) setAlerts(res.data.alerts);
    });
  }, []);

  const runSearch = async (q: string) => {
    const key = q.trim();
    if (!key) return setSearch({ vehicles: [], maintenance: [] });
    const [v, m] = await Promise.all([
      apiFetch<{ vehicles: any[] }>(`/vehicles?q=${encodeURIComponent(key)}`),
      apiFetch<{ records: any[] }>(`/maintenance?q=${encodeURIComponent(key)}`),
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
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card title="到期预警中心">
        {alerts.length === 0 ? (
          <Alert type="success" showIcon message="暂无到期预警" />
        ) : (
          <List
            size="small"
            dataSource={alerts}
            renderItem={(a) => (
              <List.Item>
                <Space>
                  <Tag color={a.level === "expired" ? "red" : "orange"}>{a.level === "expired" ? "已过期" : "即将到期"}</Tag>
                  <span>{a.plateNo}</span>
                  <span>{a.type}</span>
                  {typeof a.days === "number" ? <span>{a.days} 天</span> : null}
                  {typeof a.kmLeft === "number" ? <span>{a.kmLeft} km</span> : null}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title="全局搜索（车辆 / 维保 / 设备名称）">
        <Input.Search placeholder="输入车牌、项目、设备名称" onSearch={runSearch} allowClear />
        <div className="mt-4">
          <div className="mb-2 font-medium">车辆结果</div>
          <List
            size="small"
            bordered
            dataSource={search.vehicles}
            renderItem={(v) => (
              <List.Item>
                {v.plateNo} / {v.brandModel}
              </List.Item>
            )}
          />
        </div>
        <div className="mt-4">
          <div className="mb-2 font-medium">维保结果</div>
          <List
            size="small"
            bordered
            dataSource={search.maintenance}
            renderItem={(m) => <List.Item>{m.plateNo ? `${m.plateNo} / ` : `${m.equipmentName ?? ""} / `}{m.itemDesc}</List.Item>}
          />
        </div>
      </Card>
    </Space>
  );
}

