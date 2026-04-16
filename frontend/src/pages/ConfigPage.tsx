import { Button, Card, Form, Input, InputNumber, Space, Tabs, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/http";

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

  const load = async () => {
    const res = await apiFetch<{
      config: { siteName: string; warnDays: number; versionNote: string; dropdowns?: Record<string, string[]> };
    }>("/settings");
    if (res.ok) {
      const dropdowns = res.data.config.dropdowns ?? {};
      setCurrentDropdowns(dropdowns);
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
    };
    const res = await apiFetch<{ ok: true }>("/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return message.error(res.error.message);
    message.success("保存成功");
  };

  return (
    <div className="max-w-xl">
      <Form form={form} layout="vertical">
        <Tabs
          items={[
            {
              key: "basic",
              label: "基础设置",
              children: (
                <>
                  <Form.Item label="系统名称" name="siteName" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="预警提前天数" name="warnDays" rules={[{ required: true }]}>
                    <InputNumber min={1} max={30} />
                  </Form.Item>
                  <Form.Item label="系统版本说明" name="versionNote" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </>
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
                >
                  <Typography.Text type="secondary">输入格式统一为：`选项1,选项2,选项3`</Typography.Text>
                  <Space direction="vertical" className="w-full" size={8}>
                    <Form.Item
                      label="车辆类型（vehicleType）"
                      name="vehicleTypeOptions"
                      rules={[{ required: true, message: "请输入车辆类型" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={4} placeholder="仅支持逗号分隔，例如：轿车,SUV,客车" />
                    </Form.Item>
                    <Form.Item
                      label="能源类型（energyType）"
                      name="energyTypeOptions"
                      rules={[{ required: true, message: "请输入能源类型" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={4} placeholder="仅支持逗号分隔，例如：汽油,柴油,纯电" />
                    </Form.Item>
                    <Form.Item
                      label="使用性质（usageNature）"
                      name="usageNatureOptions"
                      rules={[{ required: true, message: "请输入使用性质" }, { validator: validateCommaSeparated }]}
                    >
                      <Input.TextArea rows={4} placeholder="仅支持逗号分隔，例如：营运,非营运,公务" />
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
                      <Input.TextArea rows={4} placeholder="仅支持逗号分隔，建议4项：日常保养,故障维修,事故维修,定期检修" />
                    </Form.Item>
                  </Space>
                </Card>
              ),
            },
            {
              key: "more",
              label: "其他扩展",
              children: (
                <Card size="small">
                  <Typography.Text type="secondary">预留分组：后续可在这里新增更多系统配置项。</Typography.Text>
                </Card>
              ),
            },
          ]}
        />

        <Button type="primary" onClick={submit}>
          保存
        </Button>
        <Space className="ml-3">
          <a href="/api/export/vehicles" target="_blank" rel="noreferrer">
            导出车辆
          </a>
          <a href="/api/export/maintenance" target="_blank" rel="noreferrer">
            导出维保
          </a>
          <a href="/api/logs" target="_blank" rel="noreferrer">
            查看日志
          </a>
        </Space>
      </Form>
    </div>
  );
}

