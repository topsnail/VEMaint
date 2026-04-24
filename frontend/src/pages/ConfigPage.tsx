import { App, Button, Card, Checkbox, Collapse, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Typography } from "@/components/ui/legacy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/auth";
import { PageContainer } from "../components/PageContainer";
import { useConfigSettings } from "../hooks/useConfigSettings";
import { apiFetch, downloadProtectedFile } from "../lib/http";
import { safeJsonParse } from "../lib/safeJson";
import { actionBtn } from "../lib/ui/buttonTokens";
import { hasPerm, PERMISSION_GROUPS, PERMISSION_KEYS, normalizeRolePermissions, type PermissionKey, type RolePermissions } from "../lib/permissions";
import { MinusCircle, Plus, Users } from "lucide-react";

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
};

type ConfigFormValues = ConfigForm & {
  ownerDirectory: Array<{ name?: string; address?: string }>;
};

type OperationLogRow = {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  reason: string | null;
  createdAt: string;
};

type DisplayLogRow = OperationLogRow & {
  repeatCount?: number;
  summary?: string;
};

function normalizeOwnerText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function normalizeOwnerDirectoryRows(rows: Array<{ name?: string; address?: string }> | undefined) {
  return (rows ?? [])
    .map((r) => ({
      name: normalizeOwnerText(r?.name),
      address: normalizeOwnerText(r?.address),
    }))
    .filter((r) => r.name && r.address);
}

const LOG_ACTION_LABELS: Record<string, string> = {
  "auth.login": "登录",
  "auth.logout": "退出登录",
  "vehicle.create": "新增车辆",
  "vehicle.update": "更新车辆",
  "vehicle.status": "修改车辆状态",
  "vehicle.cycle.update": "更新车辆周期",
  "maintenance.create": "新增维保",
  "maintenance.update": "更新维保",
  "maintenance.delete": "删除维保",
  "user.create": "新增用户",
  "user.role": "修改用户角色",
  "user.password": "重置用户密码",
  "user.disabled": "启停用户",
  "user.delete": "删除用户",
  "profile.password": "修改个人密码",
};

const LOG_FIELD_LABELS: Record<string, string> = {
  id: "ID",
  userId: "用户ID",
  username: "用户名",
  role: "角色",
  disabled: "是否禁用",
  status: "状态",
  plateNo: "车牌号",
  brandModel: "品牌型号",
  vehicleId: "车辆ID",
  equipmentName: "设备名称",
  targetType: "关联类型",
  maintenanceType: "维保类型",
  itemDesc: "维保项目",
  cost: "费用",
  vendor: "服务商",
  resultStatus: "结果状态",
  ownerDept: "使用部门",
  ownerPerson: "使用人",
  mileage: "当前里程",
  attachmentKey: "附件Key",
  attachmentKeys: "附件列表",
  before: "变更前",
  after: "变更后",
  old: "旧值",
  new: "新值",
};

const FIXED_ENUMS: Array<{ key: string; label: string; options: string[] }> = [
  { key: "vehicleType", label: "车辆类型", options: ["轿车", "SUV", "客车", "货车", "面包车", "工程车", "特种车", "皮卡", "冷藏车", "危化品运输车", "公务用车", "其他"] },
  { key: "energyType", label: "能源类型", options: ["汽油", "柴油", "纯电", "插电混动", "油电混动", "天然气", "氢能", "甲醇", "其他"] },
  { key: "usageNature", label: "使用性质", options: ["营运", "非营运", "公务", "生产作业", "租赁", "货运", "通勤", "应急保障", "其他"] },
  { key: "maintenanceType", label: "维保类型", options: ["日常保养", "故障维修", "事故维修", "定期检修"] },
];

/** 使用部门（ownerDept）默认候选项，可在配置页修改 */
const DEFAULT_OWNER_DEPT_OPTIONS = ["综合办公室", "工程一部", "工程二部", "工程三部", "后勤保障部", "通勤车队", "仓储物流部", "销售部", "物流部", "质检中心", "安全管理部", "信息化部"];
const DEFAULT_EQUIPMENT_NAME_OPTIONS = ["空压机", "发电机", "液压泵", "叉车", "升降机", "焊机", "水泵", "安防主机", "空调机组", "变频柜", "传送带", "除尘机", "喷涂机", "锅炉", "冷却塔"];
const DEFAULT_EQUIPMENT_TYPE_OPTIONS = ["动力设备", "液压设备", "搬运设备", "电气设备", "安防设备", "制冷设备", "传动设备", "环保设备", "公用设施", "其他"];
const DEFAULT_EQUIPMENT_CATEGORY_OPTIONS = ["生产", "保障", "检测", "安防", "行政", "环保", "能源", "仓储", "其他"];

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
  if (/[\/、;\n\r]/.test(text)) return Promise.reject(new Error("格式错误：仅支持中文或英文逗号分隔"));
  return Promise.resolve();
}

export function ConfigPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<ConfigFormValues>();
  const { fetchConfig, saveConfig } = useConfigSettings();
  const [currentDropdowns, setCurrentDropdowns] = useState<Record<string, string[]>>({});
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => normalizeRolePermissions(null));
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsRows, setLogsRows] = useState<OperationLogRow[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsOffset, setLogsOffset] = useState(0);
  const [logQ, setLogQ] = useState("");
  const [logActor, setLogActor] = useState("");
  const [logAction, setLogAction] = useState("");
  const [logFrom, setLogFrom] = useState("");
  const [logTo, setLogTo] = useState("");
  const [logRiskOnly, setLogRiskOnly] = useState(false);
  const [logChangedOnly, setLogChangedOnly] = useState(true);
  const [logActionGroup, setLogActionGroup] = useState<"" | "auth" | "vehicle" | "maintenance" | "user" | "config">("");
  const [detailRow, setDetailRow] = useState<DisplayLogRow | null>(null);
  const LOG_PAGE_SIZE = 100;
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
    const normalizedOwnerDirectory = normalizeOwnerDirectoryRows(cfg.ownerDirectory);
    setCurrentDropdowns(dropdowns);
    setRolePermissions(normalizeRolePermissions(cfg.permissions));
    // Replace list field first to avoid stale array indexes.
    form.setFieldValue("ownerDirectory", normalizedOwnerDirectory);
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
    const ownerDirectory = normalizeOwnerDirectoryRows(values.ownerDirectory);
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
      },
      ownerDirectory,
      permissions: {
        roles: normalizedPermissions,
      },
    };
    const res = await saveConfig(payload);
    if (!res.ok) return message.error(res.error.message);
    setRolePermissions(normalizedPermissions);
    // Normalize visible rows immediately after save.
    form.setFieldValue("ownerDirectory", ownerDirectory);
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

  const loadLogs = async (nextOffset = 0, append = false) => {
    setLogsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(LOG_PAGE_SIZE));
      qs.set("offset", String(nextOffset));
      if (logQ.trim()) qs.set("q", logQ.trim());
      if (logActor.trim()) qs.set("actor", logActor.trim());
      if (logAction.trim()) qs.set("action", logAction.trim());
      if (logActionGroup.trim()) qs.set("actionPrefix", `${logActionGroup.trim()}.`);
      if (logFrom.trim()) qs.set("from", logFrom.trim());
      if (logTo.trim()) qs.set("to", logTo.trim());
      if (logRiskOnly) qs.set("riskOnly", "1");
      const res = await apiFetch<{ logs: OperationLogRow[]; total: number }>(`/logs?${qs.toString()}`);
      if (!res.ok) {
        message.error(res.error.message || "日志加载失败");
        return;
      }
      setLogsTotal(Number(res.data.total ?? 0));
      setLogsOffset(nextOffset + (res.data.logs?.length ?? 0));
      setLogsRows((prev) => (append ? [...prev, ...(res.data.logs ?? [])] : res.data.logs ?? []));
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenLogs = async () => {
    setLogsOpen(true);
  };

  const resetLogFilters = () => {
    setLogQ("");
    setLogActor("");
    setLogAction("");
    setLogFrom("");
    setLogTo("");
    setLogRiskOnly(false);
    setLogChangedOnly(true);
    setLogActionGroup("");
    setLogsRows([]);
    setLogsOffset(0);
  };

  useEffect(() => {
    if (!logsOpen) return;
    const timer = window.setTimeout(() => {
      void loadLogs(0, false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [logsOpen, logQ, logActor, logAction, logActionGroup, logFrom, logTo, logRiskOnly]);

  const actionOptions = useMemo(
    () => [
      { value: "", label: "全部动作" },
      { value: "auth.login", label: "登录" },
      { value: "auth.logout", label: "退出登录" },
      { value: "vehicle.create", label: "新增车辆" },
      { value: "vehicle.update", label: "更新车辆" },
      { value: "vehicle.status", label: "修改车辆状态" },
      { value: "vehicle.cycle.update", label: "更新车辆周期" },
      { value: "maintenance.create", label: "新增维保" },
      { value: "maintenance.update", label: "更新维保" },
      { value: "maintenance.delete", label: "删除维保" },
      { value: "user.create", label: "新增用户" },
      { value: "user.role", label: "修改用户角色" },
      { value: "user.password", label: "重置用户密码" },
      { value: "user.disabled", label: "启停用户" },
      { value: "user.delete", label: "删除用户" },
      { value: "profile.password", label: "修改个人密码" },
    ],
    [],
  );

  const isRiskAction = (action: string) =>
    action.endsWith(".delete") ||
    action.endsWith(".password") ||
    action.endsWith(".role") ||
    action.endsWith(".disabled") ||
    action.startsWith("config.");

  const maskSensitive = (text: string) => {
    return text
      .replace(/(\"password\"\s*:\s*\")([^\"]+)(\")/gi, '$1******$3')
      .replace(/(\"token\"\s*:\s*\")([^\"]+)(\")/gi, '$1******$3')
      .replace(/(\"csrfToken\"\s*:\s*\")([^\"]+)(\")/gi, '$1******$3')
      .replace(/(\"jti\"\s*:\s*\")([^\"]+)(\")/gi, '$1******$3')
      .replace(/(\"phone\"\s*:\s*\")(\d{3})\d{4}(\d{4}\")/gi, '$1$2****$3');
  };

  const localizeFieldName = (key: string) => LOG_FIELD_LABELS[key] ?? key;
  const localizeAction = (action: string) => LOG_ACTION_LABELS[action] ?? action;
  const summarizeLog = (row: OperationLogRow) => {
    const actor = row.actorUsername || "系统";
    const act = localizeAction(row.action);
    const target = row.target ? `（对象：${row.target}）` : "";
    return `${actor}${act}${target}`;
  };
  const localizeValue = (fieldKey: string, value: unknown) => {
    if (value == null || value === "") return "-";
    if (typeof value === "boolean") return value ? "是" : "否";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    if (fieldKey === "role") {
      if (text === "admin") return "管理员";
      if (text === "maintainer") return "维保员";
      if (text === "reader") return "只读";
    }
    if (fieldKey === "status") {
      if (text === "normal") return "正常";
      if (text === "repairing") return "维修中";
      if (text === "stopped") return "停用";
      if (text === "scrapped") return "报废";
    }
    if (fieldKey === "targetType") {
      if (text === "vehicle") return "车辆";
      if (text === "equipment") return "设备";
      if (text === "other") return "其他";
    }
    if (fieldKey === "maintenanceType") {
      if (text === "routine") return "日常保养";
      if (text === "fault") return "故障维修";
      if (text === "accident") return "事故维修";
      if (text === "periodic") return "定期检修";
    }
    if (fieldKey === "resultStatus") {
      if (text === "resolved") return "已修复";
      if (text === "temporary") return "临时处理";
      if (text === "pending") return "待复查";
    }
    return maskSensitive(text);
  };

  const tryParseObject = (input: unknown): Record<string, unknown> | null => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    return input as Record<string, unknown>;
  };

  const renderValueText = (v: unknown) => {
    if (v == null || v === "") return "-";
    if (typeof v === "object") return maskSensitive(JSON.stringify(v));
    return maskSensitive(String(v));
  };

  const renderDetail = (raw: string | null) => {
    if (!raw) return <span className="text-slate-400">-</span>;
    const txt = String(raw);
    const obj = safeJsonParse<Record<string, unknown> | null>(txt, { fallback: null });
    if (!obj) {
      return <span className="text-xs text-slate-600 break-all">{maskSensitive(txt)}</span>;
    }

    const beforeObj = tryParseObject((obj as Record<string, unknown>).before ?? (obj as Record<string, unknown>).old);
    const afterObj = tryParseObject((obj as Record<string, unknown>).after ?? (obj as Record<string, unknown>).new);
    if (beforeObj && afterObj) {
      const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));
      const keys = allKeys
        .filter((k) => {
          if (!logChangedOnly) return true;
          return JSON.stringify(beforeObj[k] ?? null) !== JSON.stringify(afterObj[k] ?? null);
        })
        .slice(0, 12);
      if (keys.length === 0) {
        return <span className="text-xs text-slate-500">无字段变更</span>;
      }
      return (
        <div className="space-y-1">
          {keys.map((k) => {
            const before = beforeObj[k];
            const after = afterObj[k];
            const changed = JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
            return (
              <div
                key={k}
                className={`rounded-[6px] px-1.5 py-1 text-xs ${
                  changed ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                <div className="mb-0.5 text-[11px] font-medium text-slate-500">{localizeFieldName(k)}</div>
                <div className="break-all">
                  <span className="text-slate-500">旧：</span>
                  <span className="font-medium">{localizeValue(k, before)}</span>
                  <span className="mx-1 text-slate-400">→</span>
                  <span className="text-slate-500">新：</span>
                  <span className="font-medium">{localizeValue(k, after)}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const keys = Object.keys(obj).slice(0, 6);
    return (
      <div className="space-y-0.5">
        {keys.map((k) => (
          <div key={k} className="text-xs text-slate-600">
            <span className="text-slate-400">{localizeFieldName(k)}：</span>
            <span className="break-all">{localizeValue(k, obj[k])}</span>
          </div>
        ))}
      </div>
    );
  };

  const jumpByLog = (row: OperationLogRow) => {
    if (row.action.startsWith("vehicle.")) {
      if (row.target) nav(`/vehicles?q=${encodeURIComponent(row.target)}`);
      else nav("/vehicles");
      return;
    }
    if (row.action.startsWith("maintenance.")) {
      if (row.target) nav(`/maintenance/vehicles?q=${encodeURIComponent(row.target)}`);
      else nav("/maintenance/vehicles");
      return;
    }
    if (row.action.startsWith("user.")) {
      nav("/users");
      return;
    }
    if (row.action.startsWith("config.")) {
      nav("/config");
      return;
    }
    if (row.action.startsWith("auth.") || row.action.startsWith("profile.")) {
      nav("/profile");
    }
  };

  const displayLogs = useMemo<DisplayLogRow[]>(() => {
    const out: DisplayLogRow[] = [];
    for (const row of logsRows) {
      const prev = out[out.length - 1];
      if (
        prev &&
        prev.actorUsername === row.actorUsername &&
        prev.action === row.action &&
        prev.target === row.target &&
        Math.abs(new Date(prev.createdAt).getTime() - new Date(row.createdAt).getTime()) <= 120_000
      ) {
        prev.repeatCount = (prev.repeatCount ?? 1) + 1;
        continue;
      }
      out.push({ ...row, repeatCount: 1, summary: summarizeLog(row) });
    }
    return out;
  }, [logsRows]);

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
              label: "系统参数",
              children: (
                <div className="ve-config-basic">
                  <Form.Item label="系统名称" name="siteName" rules={[{ required: true }]}>
                    <Input className="ve-input" placeholder="用于页面标题与系统展示名称" />
                  </Form.Item>
                  <Form.Item label="预警提前天数" name="warnDays" rules={[{ required: true }]}>
                    <InputNumber min={1} max={30} className="ve-input" placeholder="建议 1-30 天" />
                  </Form.Item>
                  <Form.Item label="系统版本说明" name="versionNote" rules={[{ required: true }]}>
                    <Input className="ve-input" placeholder="用于显示版本号或更新说明（例如 v1.2.0）" />
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
                  title="台账与维保字典（录入下拉选项）"
                  extra={<Typography.Text type="secondary">建议按业务口径维护，保存后全站生效</Typography.Text>}
                  className="ve-config-card"
                >
                  <Typography.Text type="secondary">输入格式统一为：中文逗号或英文逗号分隔（示例：选项1,选项2,选项3）。</Typography.Text>
                  <Space direction="vertical" className="w-full" size={8}>
                    <Form.Item
                      label="车辆类型"
                      name="vehicleTypeOptions"
                      rules={[{ required: true, message: "请输入车辆类型" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：轿车,SUV,客车,货车,工程车" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="能源类型"
                      name="energyTypeOptions"
                      rules={[{ required: true, message: "请输入能源类型" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：汽油,柴油,纯电,插电混动" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="使用性质"
                      name="usageNatureOptions"
                      rules={[{ required: true, message: "请输入使用性质" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：营运,非营运,公务,生产作业" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="维保类型"
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
                      <Input.TextArea rows={1} placeholder="建议固定 4 项：日常保养,故障维修,事故维修,定期检修" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="使用部门"
                      name="ownerDeptOptions"
                      rules={[{ required: true, message: "请输入使用部门" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea
                        rows={1}
                        placeholder="例如：综合办公室,工程一部,仓储物流部（用于车辆/设备台账“使用部门”下拉）"
                        className="ve-textarea"
                      />
                    </Form.Item>
                    <Form.Item
                      label="设备名称"
                      name="equipmentNameOptions"
                      rules={[{ required: true, message: "请输入设备名称字典" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：空压机,发电机,液压泵,叉车,冷却塔" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="设备类型"
                      name="equipmentTypeOptions"
                      rules={[{ required: true, message: "请输入设备类型字典" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：动力设备,液压设备,搬运设备,电气设备,公用设施" className="ve-textarea" />
                    </Form.Item>
                    <Form.Item
                      label="设备分类"
                      name="equipmentCategoryOptions"
                      rules={[{ required: true, message: "请输入设备分类字典" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={1} placeholder="例如：生产,保障,检测,安防,能源,仓储" className="ve-textarea" />
                    </Form.Item>
                    <Typography.Text type="secondary" className="mt-0.5 block">
                      所有人与住址：在台账中选择“所有人”后会自动填充对应“住址”；也可手动输入未建档对象。
                    </Typography.Text>
                    <Form.List name="ownerDirectory">
                      {(fields, { add, remove }) => (
                        <div className="mt-1 space-y-1">
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} className="w-full max-w-full" align="start" wrap>
                              <Form.Item
                                {...restField}
                                name={["ownerDirectory", name, "name"]}
                                rules={[
                                  {
                                    validator: async (_, value) => {
                                      const nameValue = String(value ?? "").trim();
                                      const addressValue = String(form.getFieldValue(["ownerDirectory", name, "address"]) ?? "").trim();
                                      if (!nameValue && !addressValue) return Promise.resolve();
                                      if (nameValue) return Promise.resolve();
                                      return Promise.reject(new Error("填写所有人"));
                                    },
                                  },
                                ]}
                                className="!mb-0 min-w-[140px] flex-1"
                              >
                                <Input placeholder="所有人（个人/单位）" className="ve-input" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={["ownerDirectory", name, "address"]}
                                rules={[
                                  {
                                    validator: async (_, value) => {
                                      const addressValue = String(value ?? "").trim();
                                      const nameValue = String(form.getFieldValue(["ownerDirectory", name, "name"]) ?? "").trim();
                                      if (!nameValue && !addressValue) return Promise.resolve();
                                      if (addressValue) return Promise.resolve();
                                      return Promise.reject(new Error("填写住址"));
                                    },
                                  },
                                ]}
                                className="!mb-0 min-w-[200px] flex-[2]"
                              >
                                <Input placeholder="对应住址（将用于台账自动回填）" className="ve-input" />
                              </Form.Item>
                              <Button type="text" icon={<MinusCircle className="h-4 w-4" />} className={actionBtn.textDanger} onClick={() => remove(name)} aria-label="删除此行" />
                            </Space>
                          ))}
                          <Button type="dashed" onClick={() => add({ name: "", address: "" })} block icon={<Plus className="h-4 w-4" />} className="max-w-md">
                            新增所有人与住址映射
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
              label: "数据导出与日志",
              children: (
                <Card size="small" title="数据导出与操作日志" className="ve-config-card">
                  <Typography.Text type="secondary">支持导出 XLSX（已格式化列宽），并查看系统操作日志。</Typography.Text>
                  <div className="mt-1.5">
                    <Space wrap>
                      <Button type="link" disabled={!canExportVehicles} className={actionBtn.link} onClick={() => void handleExport("/export/vehicles", "车辆台账.xlsx")}>
                        导出车辆
                      </Button>
                      <Button type="link" disabled={!canExportMaintenance} className={actionBtn.link} onClick={() => void handleExport("/export/maintenance", "维保记录.xlsx")}>
                        导出维保
                      </Button>
                      <Button type="link" disabled={!canViewLogs} className={actionBtn.link} onClick={() => void handleOpenLogs()}>
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
                      <Button type="primary" icon={<Users className="h-4 w-4" />} onClick={() => nav("/users")} disabled={!canManageUsers} className={actionBtn.primary}>
                        用户管理
                      </Button>
                      <Button onClick={() => nav("/users")} disabled={!canManageUsers} className={actionBtn.neutral}>
                        打开用户列表
                      </Button>
                    </Space>
                    <div className="ve-permission-container rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="mb-2 flex items-center justify-end gap-3 border-b border-slate-100 pb-2">
                        {(Object.keys(roleLabel) as Array<keyof RolePermissions>).map((role) => (
                          <Space key={role} size={8}>
                            <Typography.Text strong>{roleLabel[role]}</Typography.Text>
                            <Button size="small" onClick={() => setRoleAll(role, true)} className={actionBtn.smallNeutral}>
                              全选
                            </Button>
                            <Button size="small" onClick={() => setRoleAll(role, false)} className={actionBtn.smallNeutral}>
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
          <Button type="primary" onClick={submit} className={actionBtn.primary}>
            保存配置
          </Button>
        </div>
      </Form>
      <Modal
        open={logsOpen}
        centered
        title="系统操作日志"
        width={1080}
        onCancel={() => setLogsOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setLogsOpen(false)}>关闭</Button>
          </Space>
        }
      >
        <div className="space-y-3">
          <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-2">
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3 lg:grid-cols-6">
              <Input value={logQ} onChange={(e) => setLogQ(e.target.value)} placeholder="关键词（用户/动作/对象/详情）" />
              <Input value={logActor} onChange={(e) => setLogActor(e.target.value)} placeholder="操作人" />
              <Select options={actionOptions} value={logAction} onChange={(v) => setLogAction(String(v ?? ""))} />
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { key: "", label: "全部分组" },
                  { key: "auth", label: "认证" },
                  { key: "vehicle", label: "车辆" },
                  { key: "maintenance", label: "维保" },
                  { key: "user", label: "用户" },
                  { key: "config", label: "配置" },
                ].map((g) => (
                  <Button
                    key={g.key || "all"}
                    size="small"
                    className={`h-5 rounded-[6px] px-1.5 text-[11px] ${
                      logActionGroup === g.key
                        ? "border border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => setLogActionGroup(g.key as typeof logActionGroup)}
                  >
                    {g.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={logRiskOnly} onChange={(e) => setLogRiskOnly(!!e.target.checked)} />
                <span className="text-xs text-slate-600">仅风险操作</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={logChangedOnly} onChange={(e) => setLogChangedOnly(!!e.target.checked)} />
                <span className="text-xs text-slate-600">仅看有字段变化</span>
              </div>
              <Input type="date" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} />
              <Input type="date" value={logTo} onChange={(e) => setLogTo(e.target.value)} />
              <Space>
                <Button onClick={() => void loadLogs(0, false)} loading={logsLoading} className={actionBtn.smallNeutral}>
                  查询
                </Button>
                <Button onClick={() => void resetLogFilters()} className={actionBtn.smallNeutral}>
                  重置
                </Button>
              </Space>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            总计 <span className="tabular-nums font-medium text-slate-700">{logsTotal}</span> 条，时间按本地时区显示（北京时间）。
          </div>

          <Table
            size="small"
            pagination={false}
            rowKey={(r: DisplayLogRow) => r.id}
            dataSource={displayLogs}
            columns={[
              {
                title: "时间",
                dataIndex: "createdAt",
                width: 170,
                render: (v: string) => <span className="tabular-nums text-xs">{v?.replace("T", " ").slice(0, 19) || "-"}</span>,
              },
              {
                title: "操作人",
                dataIndex: "actorUsername",
                width: 110,
                render: (v: string | null) => <span className="text-sm">{v || "-"}</span>,
              },
              {
                title: "摘要",
                dataIndex: "summary",
                width: 240,
                render: (v: string, row: DisplayLogRow) => (
                  <span className="text-xs text-slate-700">
                    {v}
                    {(row.repeatCount ?? 1) > 1 ? (
                      <span className="ml-1 inline-flex rounded-[6px] bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                        x{row.repeatCount}
                      </span>
                    ) : null}
                  </span>
                ),
              },
              {
                title: "动作",
                dataIndex: "action",
                width: 170,
                render: (v: string) =>
                  isRiskAction(v) ? (
                    <span className="inline-flex rounded-[6px] bg-red-50 px-1.5 py-0.5 text-xs text-red-700">{localizeAction(v)}</span>
                  ) : (
                    <span className="text-xs text-slate-700">{localizeAction(v)}</span>
                  ),
              },
              {
                title: "对象",
                dataIndex: "target",
                width: 170,
                render: (v: string | null) => <span className="font-mono text-xs text-slate-600">{v || "-"}</span>,
              },
              {
                title: "详情",
                dataIndex: "detail",
                render: (v: string | null) => renderDetail(v),
              },
              {
                title: "来源",
                width: 140,
                render: (_: unknown, row: DisplayLogRow) => (
                  <div className="space-y-0.5 text-[11px] text-slate-500">
                    <div className="truncate" title={row.ip || "-"}>
                      IP：{row.ip || "-"}
                    </div>
                    <div className="truncate" title={row.reason || "-"}>
                      理由：{row.reason || "-"}
                    </div>
                  </div>
                ),
              },
              {
                title: "跳转",
                width: 136,
                className: "text-center",
                render: (_: unknown, row: DisplayLogRow) => (
                  <Space size={4}>
                    <Button size="small" className={actionBtn.smallNeutral} onClick={() => jumpByLog(row)}>
                      跳转
                    </Button>
                    <Button size="small" className={actionBtn.smallNeutral} onClick={() => setDetailRow(row)}>
                      详情
                    </Button>
                  </Space>
                ),
              },
            ]}
          />

          {displayLogs.length < logsTotal ? (
            <div className="flex justify-center">
              <Button
                onClick={() => void loadLogs(logsOffset, true)}
                loading={logsLoading}
                className={actionBtn.smallNeutral}
              >
                加载更多
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
      <Modal
        open={!!detailRow}
        centered
        title="日志详情"
        width={760}
        onCancel={() => setDetailRow(null)}
        footer={
          <Space>
            <Button onClick={() => setDetailRow(null)}>关闭</Button>
          </Space>
        }
      >
        {detailRow ? (
          <div className="space-y-2 text-sm">
            <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-2">
              <div className="text-xs text-slate-500">摘要</div>
              <div className="mt-0.5 text-sm text-slate-700">{detailRow.summary}</div>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="rounded-[6px] border border-slate-200 p-2">
                <div className="text-xs text-slate-500">动作</div>
                <div>{localizeAction(detailRow.action)}</div>
              </div>
              <div className="rounded-[6px] border border-slate-200 p-2">
                <div className="text-xs text-slate-500">操作时间</div>
                <div className="tabular-nums">{detailRow.createdAt?.replace("T", " ").slice(0, 19) || "-"}</div>
              </div>
              <div className="rounded-[6px] border border-slate-200 p-2">
                <div className="text-xs text-slate-500">来源 IP</div>
                <div className="font-mono text-xs">{detailRow.ip || "-"}</div>
              </div>
              <div className="rounded-[6px] border border-slate-200 p-2">
                <div className="text-xs text-slate-500">操作理由</div>
                <div>{detailRow.reason || "-"}</div>
              </div>
            </div>
            <div className="rounded-[6px] border border-slate-200 p-2">
              <div className="text-xs text-slate-500">User-Agent</div>
              <div className="mt-0.5 break-all text-xs text-slate-700">{detailRow.userAgent || "-"}</div>
            </div>
            <div className="rounded-[6px] border border-slate-200 p-2">
              <div className="mb-1 text-xs text-slate-500">变更详情</div>
              {renderDetail(detailRow.detail)}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
    </PageContainer>
  );
}

