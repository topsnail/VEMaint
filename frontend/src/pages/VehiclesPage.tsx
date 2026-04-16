import { DeleteOutlined, EditOutlined, EyeOutlined, PaperClipOutlined, ShareAltOutlined } from "@ant-design/icons";
import { Button, Col, DatePicker, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Space, Spin, Table, Tabs, Tag, Tooltip, message } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import type { Vehicle, VehicleCycle } from "../types";
import { apiFetch } from "../lib/http";
import { uploadFile } from "../lib/http";

type VehicleForm = {
  plateNo: string;
  vehicleType: string;
  energyType?: string;
  brandModel: string;
  vin: string;
  engineNo: string;
  regDate?: string | Dayjs;
  issueDate?: string | Dayjs;
  loadPeople?: string;
  loadWeight?: string;
  dimensions?: string;
  ownerAddress?: string;
  archiveNo?: string;
  ownerName?: string;
  loadSpec?: string;
  usageNature?: string;
  ownerDept: string;
  ownerPerson: string;
  mileage: number;
  status: "normal" | "repairing" | "scrapped" | "stopped";
  drivingLicenseAttachmentKey?: string;
  insuranceType?: string;
  insuranceVendor?: string;
  insuranceStart?: string;
  insuranceExpiry?: string;
  insuranceAttachmentKey?: string;
  annualLastDate?: string;
  annualExpiry?: string;
  maintLastDate?: string;
  maintIntervalDays?: number;
  maintIntervalKm?: number;
  maintNextDate?: string;
  maintNextKm?: number;
  remark?: string;
};

export function VehiclesPage({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);
  const [viewCycle, setViewCycle] = useState<VehicleCycle | null>(null);
  const [viewTab, setViewTab] = useState("base");
  const [editTab, setEditTab] = useState("basic");
  const [cyclesByVehicleId, setCyclesByVehicleId] = useState<Record<string, VehicleCycle | null>>({});
  const [warnDays, setWarnDays] = useState(7);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterVehicleType, setFilterVehicleType] = useState<string>("");
  const [filterOwnerDept, setFilterOwnerDept] = useState<string>("");
  const [filterNearDue, setFilterNearDue] = useState<string>("");
  const [form] = Form.useForm<VehicleForm>();

  const parseRemarkMeta = (remarkText: string | null | undefined) => {
    const lines = (remarkText ?? "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const pick = (prefix: string) => {
      const line = lines.find((l) => l.startsWith(prefix));
      return line ? line.slice(prefix.length).trim() : "";
    };
    const meta = {
      archiveNo: pick("档案编号:"),
      ownerName: pick("所有人:"),
      issueDate: pick("发证日期:"),
      ownerAddress: pick("住址:"),
      drivingLicenseAttachmentKey: pick("行驶证附件Key:"),
    };
    const body = lines
      .filter(
        (l) =>
          !l.startsWith("档案编号:") &&
          !l.startsWith("所有人:") &&
          !l.startsWith("发证日期:") &&
          !l.startsWith("住址:") &&
          !l.startsWith("行驶证附件Key:"),
      )
      .join("\n");
    return { ...meta, remarkBody: body };
  };

  const load = async () => {
    const res = await apiFetch<{ vehicles: Vehicle[] }>(`/vehicles?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      setRows(res.data.vehicles);
      const cycleEntries = await Promise.all(
        res.data.vehicles.map(async (v) => {
          const cycleRes = await apiFetch<{ cycle: VehicleCycle | null }>(`/vehicles/${v.id}/cycles`);
          return [v.id, cycleRes.ok ? cycleRes.data.cycle : null] as const;
        }),
      );
      setCyclesByVehicleId(Object.fromEntries(cycleEntries));
    }
  };

  const loadDropdowns = async () => {
    const res = await apiFetch<{ config: { dropdowns?: Record<string, string[]>; warnDays?: number } }>("/settings");
    if (res.ok) {
      setDropdowns(res.data.config.dropdowns ?? {});
      if (typeof res.data.config.warnDays === "number") setWarnDays(res.data.config.warnDays);
    }
  };

  const renderTextInput = (key: string, placeholder?: string) => {
    const normalizeDropdownOptions = (source: string[] | undefined) => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const raw of source ?? []) {
        const parts = String(raw ?? "")
          .replace(/，/g, ",")
          .split(/,|\/|、|\r?\n|\s+/)
          .map((x) => x.trim())
          .filter(Boolean);
        for (const item of parts) {
          if (seen.has(item)) continue;
          seen.add(item);
          result.push(item);
        }
      }
      return result;
    };
    const options = normalizeDropdownOptions(dropdowns[key]);
    if (options.length === 0) return <Input placeholder={placeholder} />;
    return <Select allowClear showSearch options={options.map((v) => ({ label: v, value: v }))} placeholder={placeholder} />;
  };

  const statusOptions = [
    { label: "正常", value: "normal" },
    { label: "维修中", value: "repairing" },
    { label: "停用", value: "stopped" },
    { label: "报废", value: "scrapped" },
  ] as const;
  const normalizeDropdownOptions = (source: string[] | undefined, fallback: string[]) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of source ?? fallback) {
      const parts = String(raw ?? "")
        .replace(/，/g, ",")
        .split(/,|\/|、|\r?\n|\s+/)
        .map((x) => x.trim())
        .filter(Boolean);
      for (const item of parts) {
        if (seen.has(item)) continue;
        seen.add(item);
        result.push(item);
      }
    }
    return result.length > 0 ? result : fallback;
  };
  const vehicleTypeOptions = normalizeDropdownOptions(dropdowns.vehicleType, ["轿车", "SUV", "客车", "货车", "面包车", "工程车", "特种车", "其他"]).map(
    (v) => ({ label: v, value: v }),
  );
  const energyTypeOptions = normalizeDropdownOptions(dropdowns.energyType, ["汽油", "柴油", "纯电", "插电混动", "油电混动", "天然气", "氢能", "其他"]).map(
    (v) => ({ label: v, value: v }),
  );
  const usageNatureOptions = normalizeDropdownOptions(dropdowns.usageNature, ["营运", "非营运", "公务", "生产作业", "租赁", "其他"]).map((v) => ({
    label: v,
    value: v,
  }));
  const statusMeta: Record<Vehicle["status"], { color: string; label: string }> = {
    normal: { color: "green", label: "正常" },
    repairing: { color: "orange", label: "维修中" },
    stopped: { color: "default", label: "停用" },
    scrapped: { color: "red", label: "报废" },
  };
  const isNearDue = (cycle: VehicleCycle | null | undefined) => {
    if (!cycle) return false;
    const today = dayjs().startOf("day");
    const check = (value: string | null | undefined) => {
      if (!value) return false;
      const d = dayjs(value);
      if (!d.isValid()) return false;
      return d.startOf("day").diff(today, "day") <= warnDays;
    };
    return check(cycle.insuranceExpiry) || check(cycle.annualExpiry) || check(cycle.maintNextDate);
  };
  const getDueHint = (cycle: VehicleCycle | null | undefined) => {
    if (!cycle) return { text: "-", color: "default" as const };
    const today = dayjs().startOf("day");
    const candidates = [
      { label: "保险", date: cycle.insuranceExpiry },
      { label: "年审", date: cycle.annualExpiry },
      { label: "保养", date: cycle.maintNextDate },
    ]
      .map((x) => ({ ...x, parsed: x.date ? dayjs(x.date).startOf("day") : null }))
      .filter((x) => x.parsed && x.parsed.isValid()) as Array<{ label: string; date: string | null; parsed: Dayjs }>;
    if (candidates.length === 0) return { text: "-", color: "default" as const };
    candidates.sort((a, b) => a.parsed.diff(b.parsed, "day"));
    const nearest = candidates[0];
    const diffDays = nearest.parsed.diff(today, "day");
    if (diffDays < 0) return { text: `${nearest.label}已逾期${Math.abs(diffDays)}天`, color: "red" as const };
    if (diffDays <= warnDays) return { text: `${nearest.label}${diffDays}天后到期`, color: "orange" as const };
    return { text: `${nearest.label}正常`, color: "green" as const };
  };
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterVehicleType && r.vehicleType !== filterVehicleType) return false;
      if (filterOwnerDept && r.ownerDept !== filterOwnerDept) return false;
      if (filterNearDue && !isNearDue(cyclesByVehicleId[r.id])) return false;
      return true;
    });
  }, [rows, filterStatus, filterVehicleType, filterOwnerDept, filterNearDue, cyclesByVehicleId, warnDays]);
  const vehicleTypeFilterOptions = Array.from(new Set(rows.map((r) => r.vehicleType))).map((v) => ({ label: v, value: v }));
  const ownerDeptFilterOptions = Array.from(new Set(rows.map((r) => r.ownerDept))).map((v) => ({ label: v, value: v }));

  useEffect(() => {
    load();
    loadDropdowns();
  }, []);

  const submit = async () => {
    const v = await form.validateFields();
    const normalizeDate = (value: unknown) => {
      if (!value) return "";
      if (typeof value === "string") return value.trim();
      if (typeof (value as { format?: (pattern: string) => string }).format === "function") {
        return (value as { format: (pattern: string) => string }).format("YYYY-MM-DD");
      }
      return "";
    };
    const regDate = normalizeDate(v.regDate);
    const issueDate = normalizeDate(v.issueDate);
    const mergedUsageNature = [v.energyType, v.usageNature].filter(Boolean).join(" / ");
    const mergedLoadSpec = [v.loadPeople, v.loadWeight, v.dimensions].filter(Boolean).join(" / ");
    const mergedRemark = [
      v.remark,
      v.archiveNo ? `档案编号: ${v.archiveNo}` : "",
      v.ownerName ? `所有人: ${v.ownerName}` : "",
      issueDate ? `发证日期: ${issueDate}` : "",
      v.ownerAddress ? `住址: ${v.ownerAddress}` : "",
      v.drivingLicenseAttachmentKey ? `行驶证附件Key: ${v.drivingLicenseAttachmentKey}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const payload = {
      ...v,
      regDate: regDate || null,
      loadSpec: mergedLoadSpec || null,
      usageNature: mergedUsageNature || null,
      remark: mergedRemark || null,
    };
    const res = await apiFetch<{ id?: string }>(editing ? `/vehicles/${editing.id}` : "/vehicles", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return message.error(res.error.message);
    const vehicleId = editing ? editing.id : res.data.id;
    if (vehicleId) {
      await apiFetch(`/vehicles/${vehicleId}/cycles`, {
        method: "PUT",
        body: JSON.stringify({
          insuranceType: v.insuranceType || null,
          insuranceVendor: v.insuranceVendor || null,
          insuranceStart: v.insuranceStart || null,
          insuranceExpiry: v.insuranceExpiry || null,
          insuranceAttachmentKey: v.insuranceAttachmentKey || null,
          annualLastDate: v.annualLastDate || null,
          annualExpiry: v.annualExpiry || null,
          maintLastDate: v.maintLastDate || null,
          maintIntervalDays: v.maintIntervalDays ?? null,
          maintIntervalKm: v.maintIntervalKm ?? null,
          maintNextDate: v.maintNextDate || null,
          maintNextKm: v.maintNextKm ?? null,
        }),
      });
    }
    setOpen(false);
    form.resetFields();
    setEditing(null);
    await load();
  };

  const setStatus = async (id: string, status: Vehicle["status"]) => {
    const res = await apiFetch<{ ok: true }>(`/vehicles/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
    if (!res.ok) return message.error(res.error.message);
    message.success("状态已更新");
    await load();
  };

  const openEdit = (r: Vehicle, tab: "basic" | "insurance" | "annual" | "maint" = "basic") => {
    const splitCombined = (text: string | null | undefined) => {
      const parts = (text ?? "")
        .split("/")
        .map((x) => x.trim())
        .filter(Boolean);
      return parts;
    };

    const [energyType, usageNature] = splitCombined(r.usageNature);
    const [loadPeople, loadWeight, dimensions] = splitCombined(r.loadSpec);
    const meta = parseRemarkMeta(r.remark);

    setEditing(r);
    setEditTab(tab);
    form.setFieldsValue({
      plateNo: r.plateNo,
      vehicleType: r.vehicleType,
      brandModel: r.brandModel,
      vin: r.vin,
      engineNo: r.engineNo,
      regDate: r.regDate ? dayjs(r.regDate) : undefined,
      loadSpec: r.loadSpec || "",
      usageNature: usageNature || "",
      energyType: energyType || "",
      issueDate: meta.issueDate ? dayjs(meta.issueDate) : undefined,
      archiveNo: meta.archiveNo || "",
      ownerName: meta.ownerName || "",
      loadPeople: loadPeople || "",
      loadWeight: loadWeight || "",
      dimensions: dimensions || "",
      ownerAddress: meta.ownerAddress || "",
      ownerDept: r.ownerDept,
      ownerPerson: r.ownerPerson,
      mileage: r.mileage,
      status: r.status,
      drivingLicenseAttachmentKey: meta.drivingLicenseAttachmentKey || "",
      remark: meta.remarkBody || "",
    });

    apiFetch<{ cycle: VehicleCycle | null }>(`/vehicles/${r.id}/cycles`)
      .then((cycleRes) => {
        if (cycleRes.ok && cycleRes.data.cycle) {
          const c = cycleRes.data.cycle;
          form.setFieldsValue({
            insuranceType: c.insuranceType || "",
            insuranceVendor: c.insuranceVendor || "",
            insuranceStart: c.insuranceStart || "",
            insuranceExpiry: c.insuranceExpiry || "",
            insuranceAttachmentKey: c.insuranceAttachmentKey || "",
            annualLastDate: c.annualLastDate || "",
            annualExpiry: c.annualExpiry || "",
            maintLastDate: c.maintLastDate || "",
            maintIntervalDays: c.maintIntervalDays ?? undefined,
            maintIntervalKm: c.maintIntervalKm ?? undefined,
            maintNextDate: c.maintNextDate || "",
            maintNextKm: c.maintNextKm ?? undefined,
          });
        }
      })
      .finally(() => setOpen(true));
  };

  const shareVehicle = async (r: Vehicle) => {
    const link = `${window.location.origin}/vehicles?q=${encodeURIComponent(r.plateNo)}`;
    try {
      await navigator.clipboard.writeText(link);
      message.success("链接已复制");
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  const updateQueryInUrl = (value: string) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  };

  const openView = async (r: Vehicle, tab: "base" | "cycle" | "files" = "base") => {
    setViewVehicle(r);
    setViewCycle(null);
    setViewTab(tab);
    setViewOpen(true);
    setViewLoading(true);
    try {
      const cycleRes = await apiFetch<{ cycle: VehicleCycle | null }>(`/vehicles/${r.id}/cycles`);
      if (cycleRes.ok) setViewCycle(cycleRes.data.cycle);
    } finally {
      setViewLoading(false);
    }
  };

  const uploadInsurance = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const up = await uploadFile(file);
      if (!up.ok) return message.error(up.error.message);
      form.setFieldValue("insuranceAttachmentKey", up.data.key);
      message.success("保单附件上传成功");
    };
    input.click();
  };

  const uploadDrivingLicense = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const up = await uploadFile(file);
      if (!up.ok) return message.error(up.error.message);
      form.setFieldValue("drivingLicenseAttachmentKey", up.data.key);
      message.success("行驶证附件上传成功");
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Space>
          <Input.Search
            placeholder="搜索车牌/品牌/归属"
            defaultValue={q}
            onSearch={(v) => {
              const nextQ = v.trim();
              setQ(nextQ);
              updateQueryInUrl(nextQ);
              setTimeout(load, 0);
            }}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 120 }}
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(v ?? "")}
            options={[
              { label: "正常", value: "normal" },
              { label: "维修中", value: "repairing" },
              { label: "停用", value: "stopped" },
              { label: "报废", value: "scrapped" },
            ]}
          />
          <Select
            allowClear
            placeholder="车辆类型"
            style={{ width: 140 }}
            value={filterVehicleType || undefined}
            onChange={(v) => setFilterVehicleType(v ?? "")}
            options={vehicleTypeFilterOptions}
          />
          <Select
            allowClear
            placeholder="使用部门"
            style={{ width: 140 }}
            value={filterOwnerDept || undefined}
            onChange={(v) => setFilterOwnerDept(v ?? "")}
            options={ownerDeptFilterOptions}
          />
          <Select
            allowClear
            placeholder="临近到期"
            style={{ width: 140 }}
            value={filterNearDue || undefined}
            onChange={(v) => setFilterNearDue(v ?? "")}
            options={[{ label: `是（${warnDays}天内）`, value: "yes" }]}
          />
        </Space>
        {canManage ? (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            新增车辆
          </Button>
        ) : null}
      </div>

      <Table
        className="ve-table"
        size="small"
        tableLayout="auto"
        rowKey="id"
        dataSource={filteredRows}
        columns={[
          { title: "号牌号码", dataIndex: "plateNo" },
          { title: "车辆类型", dataIndex: "vehicleType" },
          {
            title: "能源类型",
            render: (_, r) => {
              const text = (r.usageNature ?? "").trim();
              if (!text) return "-";
              const [energy] = text.split("/");
              return energy.trim() || "-";
            },
          },
          { title: "使用部门", dataIndex: "ownerDept" },
          { title: "责任人", dataIndex: "ownerPerson" },
          {
            title: "车辆状态",
            render: (_, r) => <Tag color={statusMeta[r.status].color}>{statusMeta[r.status].label}</Tag>,
          },
          { title: "本次保养里程", dataIndex: "mileage" },
          {
            title: "下次保养里程",
            render: (_, r) => cyclesByVehicleId[r.id]?.maintNextKm ?? "-",
          },
          {
            title: "到期提醒",
            render: (_, r) => {
              const hint = getDueHint(cyclesByVehicleId[r.id]);
              return <Tag color={hint.color}>{hint.text}</Tag>;
            },
          },
          {
            title: "备注",
            render: (_, r) => parseRemarkMeta(r.remark).remarkBody || "-",
          },
          {
            title: "操作",
            width: 160,
            render: (_, r) => (
              <Space size={6}>
                {canManage ? (
                  <Tooltip title="编辑">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r, "basic")} />
                  </Tooltip>
                ) : null}
                {canManage ? (
                  <Popconfirm title="确认删除该车辆？" description="将车辆状态设置为“报废”" onConfirm={() => setStatus(r.id, "scrapped")}>
                    <Tooltip title="删除">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                ) : null}
                <Tooltip title="查看车辆详情">
                  <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openView(r)} />
                </Tooltip>
                <Tooltip title="查看附件">
                  <Button type="text" size="small" icon={<PaperClipOutlined />} onClick={() => openView(r, "files")} />
                </Tooltip>
                <Tooltip title="分享">
                  <Button type="text" size="small" icon={<ShareAltOutlined />} onClick={() => shareVehicle(r)} />
                </Tooltip>
              </Space>
            ),
          },
        ]}
      />

      <Modal title="车辆详情" open={viewOpen} onCancel={() => setViewOpen(false)} footer={null} width={920} style={{ top: 24 }}>
        {viewVehicle ? (
          <Spin spinning={viewLoading}>
            <Tabs
              activeKey={viewTab}
              onChange={(k) => setViewTab(k)}
              items={[
                {
                  key: "base",
                  label: "基础信息",
                  children: (
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="号牌号码">{viewVehicle.plateNo}</Descriptions.Item>
                      <Descriptions.Item label="车辆类型">{viewVehicle.vehicleType}</Descriptions.Item>
                      <Descriptions.Item label="品牌型号">{viewVehicle.brandModel}</Descriptions.Item>
                      <Descriptions.Item label="车辆识别代号">{viewVehicle.vin}</Descriptions.Item>
                      <Descriptions.Item label="发动机号">{viewVehicle.engineNo}</Descriptions.Item>
                      <Descriptions.Item label="注册日期">{viewVehicle.regDate || "-"}</Descriptions.Item>
                      <Descriptions.Item label="当前里程">{viewVehicle.mileage}</Descriptions.Item>
                      <Descriptions.Item label="车辆状态">
                        <Tag color={statusMeta[viewVehicle.status].color}>{statusMeta[viewVehicle.status].label}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="使用部门">{viewVehicle.ownerDept}</Descriptions.Item>
                      <Descriptions.Item label="责任人">{viewVehicle.ownerPerson}</Descriptions.Item>
                      <Descriptions.Item label="备注" span={2}>
                        {parseRemarkMeta(viewVehicle.remark).remarkBody || "-"}
                      </Descriptions.Item>
                      {canManage ? (
                        <Descriptions.Item label="操作" span={2}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => {
                              setViewOpen(false);
                              openEdit(viewVehicle, "basic");
                            }}
                          >
                            编辑基础信息
                          </Button>
                        </Descriptions.Item>
                      ) : null}
                    </Descriptions>
                  ),
                },
                {
                  key: "cycle",
                  label: "周期信息",
                  children: (
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="保险类型">{viewCycle?.insuranceType || "-"}</Descriptions.Item>
                      <Descriptions.Item label="保险公司">{viewCycle?.insuranceVendor || "-"}</Descriptions.Item>
                      <Descriptions.Item label="投保日期">{viewCycle?.insuranceStart || "-"}</Descriptions.Item>
                      <Descriptions.Item label="到期日期">{viewCycle?.insuranceExpiry || "-"}</Descriptions.Item>
                      <Descriptions.Item label="上次审车日期">{viewCycle?.annualLastDate || "-"}</Descriptions.Item>
                      <Descriptions.Item label="年审到期日">{viewCycle?.annualExpiry || "-"}</Descriptions.Item>
                      <Descriptions.Item label="上次保养日期">{viewCycle?.maintLastDate || "-"}</Descriptions.Item>
                      <Descriptions.Item label="保养间隔天数">{viewCycle?.maintIntervalDays ?? "-"}</Descriptions.Item>
                      <Descriptions.Item label="保养间隔里程">{viewCycle?.maintIntervalKm ?? "-"}</Descriptions.Item>
                      <Descriptions.Item label="下次保养日期">{viewCycle?.maintNextDate || "-"}</Descriptions.Item>
                      <Descriptions.Item label="下次保养里程">{viewCycle?.maintNextKm ?? "-"}</Descriptions.Item>
                      {canManage ? (
                        <Descriptions.Item label="操作" span={2}>
                          <Space>
                            <Button
                              size="small"
                              onClick={() => {
                                setViewOpen(false);
                                openEdit(viewVehicle, "insurance");
                              }}
                            >
                              编辑保险
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setViewOpen(false);
                                openEdit(viewVehicle, "annual");
                              }}
                            >
                              编辑年审
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setViewOpen(false);
                                openEdit(viewVehicle, "maint");
                              }}
                            >
                              编辑保养
                            </Button>
                          </Space>
                        </Descriptions.Item>
                      ) : null}
                    </Descriptions>
                  ),
                },
                {
                  key: "files",
                  label: "附件",
                  children: (
                    <Space direction="vertical" size={8}>
                      {viewCycle?.insuranceAttachmentKey ? (
                        <a href={`/api/files/${encodeURIComponent(viewCycle.insuranceAttachmentKey)}`} target="_blank" rel="noreferrer">
                          查看保单附件
                        </a>
                      ) : (
                        <span>保单附件：-</span>
                      )}
                      {parseRemarkMeta(viewVehicle.remark).drivingLicenseAttachmentKey ? (
                        <a
                          href={`/api/files/${encodeURIComponent(parseRemarkMeta(viewVehicle.remark).drivingLicenseAttachmentKey)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          查看行驶证附件
                        </a>
                      ) : (
                        <span>行驶证附件：-</span>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </Spin>
        ) : null}
      </Modal>

      <Modal
        title={editing ? "编辑车辆" : "新增车辆"}
        open={open}
        width={920}
        style={{ top: 24 }}
        onCancel={() => setOpen(false)}
        onOk={submit}
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto" },
          footer: {
            position: "sticky",
            bottom: 0,
            marginTop: 0,
            background: "#fff",
            zIndex: 2,
            paddingTop: 12,
          },
        }}
      >
        <Form form={form} layout="vertical">
          <Tabs
            activeKey={editTab}
            onChange={(k) => setEditTab(k)}
            items={[
              {
                key: "basic",
                label: "基础信息",
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="号牌号码" name="plateNo" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="车辆类型" name="vehicleType" rules={[{ required: true }]}>
                        <Select options={vehicleTypeOptions} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="能源类型" name="energyType" rules={[{ required: true }]}>
                        <Select allowClear options={energyTypeOptions} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="使用性质" name="usageNature" rules={[{ required: true }]}>
                        <Select allowClear options={usageNatureOptions} placeholder="如：营运/非营运" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="品牌型号" name="brandModel" rules={[{ required: true }]}>
                        {renderTextInput("brandModel")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="车辆识别代号" name="vin" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="发动机号" name="engineNo" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="注册日期" name="regDate" rules={[{ required: true }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="发证日期" name="issueDate" rules={[{ required: true }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="档案编号" name="archiveNo" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="核定载人数" name="loadPeople" rules={[{ required: true }]}>
                        {renderTextInput("loadPeople")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="核定载质量" name="loadWeight" rules={[{ required: true }]}>
                        {renderTextInput("loadWeight")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="外廓尺寸" name="dimensions" rules={[{ required: true }]}>
                        {renderTextInput("dimensions")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="所有人" name="ownerName" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="住址" name="ownerAddress" rules={[{ required: true }]}>
                        {renderTextInput("ownerAddress")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="本次保养里程" name="mileage" rules={[{ required: true }]}>
                        <Input type="number" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="下次保养里程" name="maintNextKm" rules={[{ required: true }]}>
                        <Input type="number" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="车辆状态" name="status" initialValue="normal" rules={[{ required: true }]}>
                        <Select options={statusOptions as unknown as { label: string; value: VehicleForm["status"] }[]} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="使用部门" name="ownerDept" rules={[{ required: true }]}>
                        {renderTextInput("ownerDept")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="责任人" name="ownerPerson" rules={[{ required: true }]}>
                        {renderTextInput("ownerPerson")}
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="行驶证附件Key" name="drivingLicenseAttachmentKey">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Button onClick={uploadDrivingLicense}>上传行驶证</Button>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="备注" name="remark">
                        <Input.TextArea rows={4} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "insurance",
                label: "保险信息",
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="保险类型" name="insuranceType" rules={[{ required: true }]}>
                        {renderTextInput("insuranceType")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="保险公司" name="insuranceVendor" rules={[{ required: true }]}>
                        {renderTextInput("insuranceVendor")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="投保日期" name="insuranceStart" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="到期日期" name="insuranceExpiry" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="保单附件Key" name="insuranceAttachmentKey" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Button onClick={uploadInsurance}>上传保单附件</Button>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "annual",
                label: "年审信息",
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="上次审车日期" name="annualLastDate" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="年审到期日" name="annualExpiry" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "maint",
                label: "保养信息",
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="上次保养日期" name="maintLastDate" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="保养间隔天数" name="maintIntervalDays" rules={[{ required: true }]}>
                        <Input type="number" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="保养间隔里程" name="maintIntervalKm" rules={[{ required: true }]}>
                        <Input type="number" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="下次保养日期" name="maintNextDate" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
}

