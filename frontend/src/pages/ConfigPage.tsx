import { TeamOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Collapse, Form, Input, InputNumber, Space, Table, Tabs, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/auth";
import { apiFetch, downloadProtectedFile, openProtectedFile } from "../lib/http";
import { hasPerm, PERMISSION_GROUPS, PERMISSION_KEYS, normalizeRolePermissions, type PermissionKey, type RolePermissions } from "../lib/permissions";

type ConfigForm = {
  siteName: string;
  warnDays: number;
  versionNote: string;
  vehicleTypeOptions: string;
  energyTypeOptions: string;
  usageNatureOptions: string;
  maintenanceTypeOptions: string;
};

const FIXED_ENUMS: Array<{ key: string; label: string; options: string[] }> = [
  { key: "vehicleType", label: "车辆类型", options: ["轿车", "SUV", "客车", "货车", "面包车", "工程车", "特种车", "其他"] },
  { key: "energyType", label: "能源类型", options: ["汽油", "柴油", "纯电", "插电混动", "油电混动", "天然气", "氢能", "其他"] },
  { key: "usageNature", label: "使用性质", options: ["营运", "非营运", "公务", "生产作业", "租赁", "其他"] },
  { key: "maintenanceType", label: "维保类型", options: ["日常保养", "故障维修", "事故维修", "定期检修"] },
];

function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  return text
    .replace(/，/g, ",")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => {
      if (!v || seen.has(v)) return false;
      seen.add(v);
      return true;
    });
}

function toCommaSeparatedText(options: string[]): string {
  return parseOptions(
    options
      .join(",")
      .replace(/\r?\n/g, ",")
      .replace(/[\/、;]/g, ","),
  ).join(",");
}

function validateCommaSeparated(_: unknown, value?: string) {
  const text = (value ?? "").trim();
  if (!text) return Promise.reject(new Error("不能为空"));
  if (/[\/、;\n\r]/.test(text)) return Promise.reject(new Error("格式错误：仅支持逗号分隔"));
  return Promise.resolve();
}

export function ConfigPage() {
  const [form] = Form.useForm<ConfigForm>();
  const [currentDropdowns, setCurrentDropdowns] = useState<Record<string, string[]>>({});
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => normalizeRolePermissions(null));
  const me = getUser();
  const nav = useNavigate();
  const canManageUsers = me ? hasPerm(me.role, "user.manage", rolePermissions) : false;
  const canExportVehicles = me ? hasPerm(me.role, "export.vehicles", rolePermissions) : false;
  const canExportMaintenance = me ? hasPerm(me.role, "export.maintenance", rolePermissions) : false;
  const canViewLogs = me ? hasPerm(me.role, "logs.view", rolePermissions) : false;

  const load = async () => {
    const res = await apiFetch<{
      config: {
        siteName: string;
        warnDays: number;
        versionNote: string;
        dropdowns?: Record<string, string[]>;
        permissions?: { roles?: RolePermissions };
      };
    }>("/settings");
    if (res.ok) {
      const dropdowns = res.data.config.dropdowns ?? {};
      setCurrentDropdowns(dropdowns);
      setRolePermissions(normalizeRolePermissions(res.data.config.permissions));
      form.setFieldsValue({
        siteName: res.data.config.siteName,
        warnDays: res.data.config.warnDays,
        versionNote: res.data.config.versionNote,
        vehicleTypeOptions: toCommaSeparatedText(dropdowns.vehicleType ?? FIXED_ENUMS[0].options),
        energyTypeOptions: toCommaSeparatedText(dropdowns.energyType ?? FIXED_ENUMS[1].options),
        usageNatureOptions: toCommaSeparatedText(dropdowns.usageNature ?? FIXED_ENUMS[2].options),
        maintenanceTypeOptions: toCommaSeparatedText(dropdowns.maintenanceType ?? FIXED_ENUMS[3].options),
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    const normalizedPermissions = normalizeRolePermissions({ roles: rolePermissions });
    const ensuredAdmin = new Set<PermissionKey>(normalizedPermissions.admin);
    ensuredAdmin.add("config.manage");
    ensuredAdmin.add("user.manage");
    normalizedPermissions.admin = Array.from(ensuredAdmin);
    const payload = {
      siteName: values.siteName,
      warnDays: values.warnDays,
      versionNote: values.versionNote,
      dropdowns: {
        ...currentDropdowns,
        vehicleType: parseOptions(values.vehicleTypeOptions),
        energyType: parseOptions(values.energyTypeOptions),
        usageNature: parseOptions(values.usageNatureOptions),
        maintenanceType: parseOptions(values.maintenanceTypeOptions),
      },
      permissions: {
        roles: normalizedPermissions,
      },
    };
    const res = await apiFetch<{ ok: true }>("/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return message.error(res.error.message);
    setRolePermissions(normalizedPermissions);
    message.success("保存成功");
  };

  const roleLabel: Record<keyof RolePermissions, string> = {
    admin: "管理员",
    maintainer: "维保员",
    reader: "只读",
  };

  const togglePermission = (role: keyof RolePermissions, permission: PermissionKey, checked: boolean) => {
    setRolePermissions((prev) => {
      const next = { ...prev };
      const current = new Set<PermissionKey>(next[role]);
      if (checked) current.add(permission);
      else current.delete(permission);
      next[role] = Array.from(current);
      return next;
    });
  };

  const setRoleAll = (role: keyof RolePermissions, checked: boolean) => {
    setRolePermissions((prev) => ({
      ...prev,
      [role]: checked ? [...PERMISSION_KEYS] : [],
    }));
  };

  const handleExport = async (path: string, fallbackFilename: string) => {
    const res = await downloadProtectedFile(path, fallbackFilename);
    if (!res.ok) message.error(res.error.message);
  };

  const handleOpenLogs = async () => {
    const res = await openProtectedFile("/logs");
    if (!res.ok) message.error(res.error.message);
  };

  return (
    <div className="ve-config-page max-w-3xl">
      <Form form={form} layout="vertical">
        <Tabs
          items={[
            {
              key: "basic",
              label: "基础设置",
              children: (
                <div className="ve-config-basic">
                  <Form.Item label="系统名称" name="siteName" rules={[{ required: true }]}>
                    <Input className="ve-input" />
                  </Form.Item>
                  <Form.Item label="预警提前天数" name="warnDays" rules={[{ required: true }]}>
                    <InputNumber min={1} max={30} className="ve-input" />
                  </Form.Item>
                  <Form.Item label="系统版本说明" name="versionNote" rules={[{ required: true }]}>
                    <Input className="ve-input" />
                  </Form.Item>
                </div>
              ),
            },
            {
              key: "vehicle-dict",
              label: "车辆字典",
              children: (
                <Card
                  size="small"
                  title="固定枚举（车辆录入下拉）"
                  extra={<Typography.Text type="secondary">仅管理员可编辑</Typography.Text>}
                  className="ve-config-card"
                >
                  <Typography.Text type="secondary">输入格式统一为：`选项1,选项2,选项3`</Typography.Text>
                  <Space direction="vertical" className="w-full" size={8}>
                    <Form.Item
                      label="车辆类型（vehicleType）"
                      name="vehicleTypeOptions"
                      rules={[{ required: true, message: "请输入车辆类型" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={4} placeholder="仅支持逗号分隔，例如：轿车,SUV,客车" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="能源类型（energyType）"
                      name="energyTypeOptions"
                      rules={[{ required: true, message: "请输入能源类型" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={4} placeholder="仅支持逗号分隔，例如：汽油,柴油,纯电" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="使用性质（usageNature）"
                      name="usageNatureOptions"
                      rules={[{ required: true, message: "请输入使用性质" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={4} placeholder="仅支持逗号分隔，例如：营运,非营运,公务" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="维保类型（maintenanceType）"
                      name="maintenanceTypeOptions"
                      rules={[
                        { required: true, message: "请输入维保类型" },
                        { validator: validateCommaSeparated },
                        {
                          validator: (_, value?: string) =>
                            parseOptions(value ?? "").length === 4
                              ? Promise.resolve()
                              : Promise.reject(new Error("维保类型建议并要求配置 4 项")),
                        },
                      ]}
                    >
                      <Input.TextArea rows={4} placeholder="仅支持逗号分隔，建议4项：日常保养,故障维修,事故维修,定期检修" className="ve-textarea" />
                    </Form.Item>
                  </Space>
                </Card>
              ),
            },
            {
              key: "tools",
              label: "导出与日志",
              children: (
                <Card size="small" title="数据导出与操作日志" className="ve-config-card">
                  <Typography.Text type="secondary">导出为 CSV 文件，以及查看最近操作日志。</Typography.Text>
                  <div className="mt-3">
                    <Space wrap>
                      <Button
                        type="link"
                        disabled={!canExportVehicles}
                        className="ve-link-btn"
                        onClick={() => void handleExport("/export/vehicles", "vehicles.csv")}
                      >
                        导出车辆
                      </Button>
                      <Button
                        type="link"
                        disabled={!canExportMaintenance}
                        className="ve-link-btn"
                        onClick={() => void handleExport("/export/maintenance", "maintenance.csv")}
                      >
                        导出维保
                      </Button>
                      <Button type="link" disabled={!canViewLogs} className="ve-link-btn" onClick={() => void handleOpenLogs()}>
                        查看日志
                      </Button>
                    </Space>
                  </div>
                </Card>
              ),
            },
            {
              key: "more",
              label: "角色权限",
              children: (
                <Card size="small" title="角色权限" className="ve-config-card">
                  <Space direction="vertical" className="w-full" size={12}>
                    <Space>
                      <Button type="primary" icon={<TeamOutlined />} onClick={() => nav("/users")} disabled={!canManageUsers} className="ve-primary-btn">
                        用户管理
                      </Button>
                      <Button onClick={() => nav("/users")} disabled={!canManageUsers} className="ve-btn">
                        用户列表
                      </Button>
                    </Space>
                    <div className="ve-permission-container rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-3 flex items-center justify-end gap-6 border-b border-slate-100 pb-3">
                        {(Object.keys(roleLabel) as Array<keyof RolePermissions>).map((role) => (
                          <Space key={role} size={8}>
                            <Typography.Text strong>{roleLabel[role]}</Typography.Text>
                            <Button size="small" onClick={() => setRoleAll(role, true)} className="ve-small-btn">
                              全选
                            </Button>
                            <Button size="small" onClick={() => setRoleAll(role, false)} className="ve-small-btn">
                              清空
                            </Button>
                          </Space>
                        ))}
                      </div>
                      <Collapse
                        defaultActiveKey={PERMISSION_GROUPS.map((g) => g.key)}
                        items={PERMISSION_GROUPS.map((group) => ({
                          key: group.key,
                          label: (
                            <Space>
                              <Typography.Text strong>{group.label}</Typography.Text>
                              <Typography.Text type="secondary">{group.items.length} 项</Typography.Text>
                            </Space>
                          ),
                          children: (
                            <Table
                              size="small"
                              pagination={false}
                              rowKey={(r) => r.key}
                              className="ve-permission-table"
                              dataSource={group.items.map((item) => ({
                                key: item.key,
                                permission: (
                                  <div className="ve-permission-item">
                                    <Typography.Text>{item.label}</Typography.Text>
                                    <div className="text-xs text-slate-500">{item.desc}</div>
                                  </div>
                                ),
                                admin: (
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={rolePermissions.admin.includes(item.key)}
                                      onChange={(e) => togglePermission("admin", item.key, e.target.checked)}
                                      className="ve-checkbox"
                                    />
                                  </div>
                                ),
                                maintainer: (
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={rolePermissions.maintainer.includes(item.key)}
                                      onChange={(e) => togglePermission("maintainer", item.key, e.target.checked)}
                                      className="ve-checkbox"
                                    />
                                  </div>
                                ),
                                reader: (
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={rolePermissions.reader.includes(item.key)}
                                      onChange={(e) => togglePermission("reader", item.key, e.target.checked)}
                                      className="ve-checkbox"
                                    />
                                  </div>
                                ),
                              }))}
                              columns={[
                                { title: "权限", dataIndex: "permission", key: "permission", width: "52%" },
                                { title: "管理员", dataIndex: "admin", key: "admin", width: "16%", align: "center" },
                                { title: "维保员", dataIndex: "maintainer", key: "maintainer", width: "16%", align: "center" },
                                { title: "只读", dataIndex: "reader", key: "reader", width: "16%", align: "center" },
                              ]}
                            />
                          ),
                        }))}
                      />
                    </div>
                  </Space>
                </Card>
              ),
            },
          ]}
        />
        <div className="ve-config-footer sticky bottom-0 mt-4 border-t border-slate-200 bg-white pt-3">
          <Button type="primary" onClick={submit} className="ve-primary-btn">
            保存配置
          </Button>
        </div>
      </Form>
    </div>
  );
}

