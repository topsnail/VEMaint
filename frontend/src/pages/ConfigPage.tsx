import { MinusCircleOutlined, PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { App, Button, Card, Checkbox, Collapse, Form, Input, InputNumber, Space, Table, Tabs, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/auth";
import { PageContainer } from "../components/PageContainer";
import { useConfigSettings } from "../hooks/useConfigSettings";
import { downloadProtectedFile, openProtectedFile } from "../lib/http";
import { hasPerm, PERMISSION_GROUPS, PERMISSION_KEYS, normalizeRolePermissions, type PermissionKey, type RolePermissions } from "../lib/permissions";

type ConfigForm = {
  siteName: string;
  warnDays: number;
  versionNote: string;
  vehicleTypeOptions: string;
  energyTypeOptions: string;
  usageNatureOptions: string;
  maintenanceTypeOptions: string;
  ownerDeptOptions: string;
  equipmentNameOptions: string;
  equipmentTypeOptions: string;
  equipmentCategoryOptions: string;
  equipmentLocationOptions: string;
};

type ConfigFormValues = ConfigForm & {
  ownerDirectory: Array<{ name?: string; address?: string }>;
};

const FIXED_ENUMS: Array<{ key: string; label: string; options: string[] }> = [
  { key: "vehicleType", label: "车辆类型", options: ["轿车", "SUV", "客车", "货车", "面包车", "工程车", "特种车", "其他"] },
  { key: "energyType", label: "能源类型", options: ["汽油", "柴油", "纯电", "插电混动", "油电混动", "天然气", "氢能", "其他"] },
  { key: "usageNature", label: "使用性质", options: ["营运", "非营运", "公务", "生产作业", "租赁", "其他"] },
  { key: "maintenanceType", label: "维保类型", options: ["日常保养", "故障维修", "事故维修", "定期检修"] },
];

/** 使用部门（ownerDept）默认候选项，可在配置页修改 */
const DEFAULT_OWNER_DEPT_OPTIONS = ["综合部", "运输部", "仓储部", "车务部", "其他"];
const DEFAULT_EQUIPMENT_NAME_OPTIONS = ["空压机", "发电机", "液压泵", "叉车", "其他设备"];
const DEFAULT_EQUIPMENT_TYPE_OPTIONS = ["动力设备", "液压设备", "搬运设备", "电气设备", "其他"];
const DEFAULT_EQUIPMENT_CATEGORY_OPTIONS = ["生产", "保障", "检测", "安防", "其他"];
const DEFAULT_EQUIPMENT_LOCATION_OPTIONS = ["一号车间", "二号车间", "仓库", "停车场", "其他"];

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
  const { message } = App.useApp();
  const [form] = Form.useForm<ConfigFormValues>();
  const { fetchConfig, saveConfig } = useConfigSettings();
  const [currentDropdowns, setCurrentDropdowns] = useState<Record<string, string[]>>({});
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => normalizeRolePermissions(null));
  const me = getUser();
  const nav = useNavigate();
  const canManageUsers = me ? hasPerm(me.role, "user.manage", rolePermissions) : false;
  const canExportVehicles = me ? hasPerm(me.role, "export.vehicles", rolePermissions) : false;
  const canExportMaintenance = me ? hasPerm(me.role, "export.maintenance", rolePermissions) : false;
  const canViewLogs = me ? hasPerm(me.role, "logs.view", rolePermissions) : false;

  const load = async () => {
    const cfg = await fetchConfig();
    if (!cfg) return;
    const dropdowns = cfg.dropdowns ?? {};
    setCurrentDropdowns(dropdowns);
    setRolePermissions(normalizeRolePermissions(cfg.permissions));
    form.setFieldsValue({
      siteName: cfg.siteName,
      warnDays: cfg.warnDays,
      versionNote: cfg.versionNote,
      vehicleTypeOptions: toCommaSeparatedText(dropdowns.vehicleType ?? FIXED_ENUMS[0].options),
      energyTypeOptions: toCommaSeparatedText(dropdowns.energyType ?? FIXED_ENUMS[1].options),
      usageNatureOptions: toCommaSeparatedText(dropdowns.usageNature ?? FIXED_ENUMS[2].options),
      maintenanceTypeOptions: toCommaSeparatedText(dropdowns.maintenanceType ?? FIXED_ENUMS[3].options),
      ownerDeptOptions: toCommaSeparatedText(dropdowns.ownerDept ?? DEFAULT_OWNER_DEPT_OPTIONS),
      equipmentNameOptions: toCommaSeparatedText(dropdowns.equipmentName ?? DEFAULT_EQUIPMENT_NAME_OPTIONS),
      equipmentTypeOptions: toCommaSeparatedText(dropdowns.equipmentType ?? DEFAULT_EQUIPMENT_TYPE_OPTIONS),
      equipmentCategoryOptions: toCommaSeparatedText(dropdowns.equipmentCategory ?? DEFAULT_EQUIPMENT_CATEGORY_OPTIONS),
      equipmentLocationOptions: toCommaSeparatedText(dropdowns.equipmentLocation ?? DEFAULT_EQUIPMENT_LOCATION_OPTIONS),
      ownerDirectory: cfg.ownerDirectory?.length ? cfg.ownerDirectory : [],
    });
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时拉取配置
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    const normalizedPermissions = normalizeRolePermissions({ roles: rolePermissions });
    const ensuredAdmin = new Set<PermissionKey>(normalizedPermissions.admin);
    ensuredAdmin.add("config.manage");
    ensuredAdmin.add("user.manage");
    normalizedPermissions.admin = Array.from(ensuredAdmin);
    const ownerDirectory = (values.ownerDirectory ?? [])
      .map((r) => ({ name: String(r?.name ?? "").trim(), address: String(r?.address ?? "").trim() }))
      .filter((r) => r.name && r.address);
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
        ownerDept: parseOptions(values.ownerDeptOptions),
        equipmentName: parseOptions(values.equipmentNameOptions),
        equipmentType: parseOptions(values.equipmentTypeOptions),
        equipmentCategory: parseOptions(values.equipmentCategoryOptions),
        equipmentLocation: parseOptions(values.equipmentLocationOptions),
      },
      ownerDirectory,
      permissions: {
        roles: normalizedPermissions,
      },
    };
    const res = await saveConfig(payload);
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
    <PageContainer
      title="系统配置"
      breadcrumb={[
        { title: "首页", path: "/" },
        { title: "系统配置" },
      ]}
    >
      <div className="ve-config-page w-full">
      <Form form={form} layout="vertical">
        <Tabs
          items={[
            {
              key: "basic",
              label: "基础设置",
              children: (
                <div className="ve-config-basic">
                  <Form.Item label="系统名称" name="siteName" rules={[{ required: true }]}>
                    <Input className="ve-input" placeholder="显示在浏览器标题等位置" />
                  </Form.Item>
                  <Form.Item label="预警提前天数" name="warnDays" rules={[{ required: true }]}>
                    <InputNumber min={1} max={30} className="ve-input" placeholder="1–30" />
                  </Form.Item>
                  <Form.Item label="系统版本说明" name="versionNote" rules={[{ required: true }]}>
                    <Input className="ve-input" placeholder="当前版本或更新说明" />
                  </Form.Item>
                </div>
              ),
            },
            {
              key: "vehicle-dict",
              label: "台账字典",
              children: (
                <Card
                  size="small"
                  title="固定枚举（车辆/设备录入下拉）"
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
                      <Input.TextArea rows={1} placeholder="仅支持逗号分隔，例如：轿车,SUV,客车" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="能源类型（energyType）"
                      name="energyTypeOptions"
                      rules={[{ required: true, message: "请输入能源类型" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="仅支持逗号分隔，例如：汽油,柴油,纯电" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="使用性质（usageNature）"
                      name="usageNatureOptions"
                      rules={[{ required: true, message: "请输入使用性质" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="仅支持逗号分隔，例如：营运,非营运,公务" className="ve-textarea" />
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
                      <Input.TextArea rows={1} placeholder="仅支持逗号分隔，建议4项：日常保养,故障维修,事故维修,定期检修" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="使用部门（ownerDept）"
                      name="ownerDeptOptions"
                      rules={[{ required: true, message: "请输入使用部门" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea
                        rows={1}
                        placeholder="仅支持逗号分隔，例如：综合部,运输部,仓储部（车辆/设备台账「使用部门」下拉候选项）"
                        className="ve-textarea"
                      />
                    </Form.Item>
                    <Form.Item
                      label="设备名称（equipmentName）"
                      name="equipmentNameOptions"
                      rules={[{ required: true, message: "请输入设备名称字典" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：空压机,发电机,液压泵,叉车,其他设备" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="设备类型（equipmentType）"
                      name="equipmentTypeOptions"
                      rules={[{ required: true, message: "请输入设备类型字典" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：动力设备,液压设备,搬运设备,电气设备,其他" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="设备分类（equipmentCategory）"
                      name="equipmentCategoryOptions"
                      rules={[{ required: true, message: "请输入设备分类字典" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：生产,保障,检测,安防,其他" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="设备位置（equipmentLocation）"
                      name="equipmentLocationOptions"
                      rules={[{ required: true, message: "请输入设备位置字典" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：一号车间,二号车间,仓库,停车场,其他" className="ve-textarea" />
                    </Form.Item>
                    <Typography.Text type="secondary" className="mt-0.5 block">
                      所有人与住址：在台账中选择「所有人」后自动填充对应「住址」；也可在台账中手输未建档的所有人。
                    </Typography.Text>
                    <Form.List name="ownerDirectory">
                      {(fields, { add, remove }) => (
                        <div className="mt-1 space-y-1">
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} className="w-full max-w-full" align="start" wrap>
                              <Form.Item
                                {...restField}
                                name={[name, "name"]}
                                rules={[{ required: true, message: "填写所有人" }]}
                                className="!mb-0 min-w-[140px] flex-1"
                              >
                                <Input placeholder="所有人姓名或单位" className="ve-input" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "address"]}
                                rules={[{ required: true, message: "填写住址" }]}
                                className="!mb-0 min-w-[200px] flex-[2]"
                              >
                                <Input placeholder="对应住址" className="ve-input" />
                              </Form.Item>
                              <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} aria-label="删除此行" />
                            </Space>
                          ))}
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="max-w-md">
                            添加所有人与住址
                          </Button>
                        </div>
                      )}
                    </Form.List>
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
                  <div className="mt-1.5">
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
                  <Space direction="vertical" className="w-full" size={6}>
                    <Space>
                      <Button type="primary" icon={<TeamOutlined />} onClick={() => nav("/users")} disabled={!canManageUsers} className="ve-primary-btn">
                        用户管理
                      </Button>
                      <Button onClick={() => nav("/users")} disabled={!canManageUsers} className="ve-btn">
                        用户列表
                      </Button>
                    </Space>
                    <div className="ve-permission-container rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="mb-2 flex items-center justify-end gap-3 border-b border-slate-100 pb-2">
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
                        defaultActiveKey={PERMISSION_GROUPS[0] ? [PERMISSION_GROUPS[0].key] : []}
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
    </PageContainer>
  );
}

