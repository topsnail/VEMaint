import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tabs, Tooltip, message } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { apiFetch, uploadFile } from "../lib/http";
import type { MaintenanceRecord, Vehicle } from "../types";

type FormModel = {
  targetType: "vehicle" | "equipment";
  vehicleId?: string;
  equipmentName?: string;
  maintenanceType: "routine" | "fault" | "accident" | "periodic";
  maintenanceDate: string | Dayjs;
  itemDesc: string;
  cost: number;
  vendor?: string;
  parts?: string;
  mileage?: number;
  remark?: string;
  attachmentKey?: string | null;
};

export function MaintenancePage({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const [rows, setRows] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [form] = Form.useForm<FormModel>();

  const load = async () => {
    const [mRes, vRes] = await Promise.all([
      apiFetch<{ records: MaintenanceRecord[] }>("/maintenance"),
      apiFetch<{ vehicles: Vehicle[] }>("/vehicles"),
    ]);
    if (mRes.ok) setRows(mRes.data.records);
    if (vRes.ok) setVehicles(vRes.data.vehicles);
  };

  const loadDropdowns = async () => {
    const res = await apiFetch<{ config: { dropdowns?: Record<string, string[]> } }>("/settings");
    if (res.ok) setDropdowns(res.data.config.dropdowns ?? {});
  };

  useEffect(() => {
    load();
    loadDropdowns();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1" || !canEdit) return;
    setEditing(null);
    form.resetFields();
    setOpen(true);
    params.delete("create");
    const next = params.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [canEdit, form]);

  const maintenanceTypeDefaults = ["日常保养", "故障维修", "事故维修", "定期检修"];
  const maintenanceTypeCodes: FormModel["maintenanceType"][] = ["routine", "fault", "accident", "periodic"];
  const maintenanceTypeLabels = dropdowns.maintenanceType && dropdowns.maintenanceType.length > 0 ? dropdowns.maintenanceType : maintenanceTypeDefaults;
  const maintenanceTypeOptions = maintenanceTypeCodes.map((code, idx) => ({
    value: code,
    label: maintenanceTypeLabels[idx] ?? maintenanceTypeDefaults[idx],
  }));

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
    const maintenanceDate = normalizeDate(v.maintenanceDate);
    const payload = {
      ...v,
      maintenanceDate,
      vendor: v.vendor || null,
      remark: v.remark || null,
      attachmentKey: v.attachmentKey || null,
    };
    const res = await apiFetch<{ id?: string }>(editing ? `/maintenance/${editing.id}` : "/maintenance", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return message.error(res.error.message);
    message.success("保存成功");
    setOpen(false);
    setEditing(null);
    form.resetFields();
    await load();
  };

  const remove = async (id: string) => {
    const res = await apiFetch<{ ok: true }>(`/maintenance/${id}`, { method: "DELETE" });
    if (!res.ok) return message.error(res.error.message);
    message.success("删除成功");
    await load();
  };

  const onPickFile = async (f: File) => {
    const res = await uploadFile(f);
    if (!res.ok) return message.error(res.error.message);
    form.setFieldValue("attachmentKey", res.data.key);
    message.success("上传完成");
  };

  return (
    <div className="ve-maintenance-page space-y-4">
      <div className="ve-maintenance-header flex items-center justify-end">
        {canEdit ? (
          <Button
            type="primary"
            className="ve-primary-btn"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            新增维保记录
          </Button>
        ) : null}
      </div>
      <Table
        className="ve-maintenance-table ve-table"
        size="small"
        tableLayout="auto"
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: "车牌号", dataIndex: "plateNo" },
          { title: "车辆", dataIndex: "brandModel" },
          { title: "维保日期", dataIndex: "maintenanceDate" },
          { title: "项目", dataIndex: "itemDesc" },
          { title: "费用", dataIndex: "cost" },
          { title: "维修单位", dataIndex: "vendor" },
          {
            title: "附件",
            render: (_, r) =>
              r.attachmentKey ? (
                <a href={`/api/files/${encodeURIComponent(r.attachmentKey)}`} target="_blank" rel="noreferrer" className="ve-link">
                  查看
                </a>
              ) : (
                "-"
              ),
          },
          {
            title: "操作",
            render: (_, r) => (
              <Space size={6}>
                {canEdit ? (
                  <Tooltip title="编辑">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      className="ve-edit-btn"
                      onClick={() => {
                        setEditing(r);
                        form.setFieldsValue({
                          vehicleId: r.vehicleId ?? undefined,
                          targetType: r.targetType,
                          equipmentName: r.equipmentName || "",
                          maintenanceType: r.maintenanceType,
                          maintenanceDate: r.maintenanceDate ? dayjs(r.maintenanceDate) : undefined,
                          itemDesc: r.itemDesc,
                          cost: r.cost,
                          vendor: r.vendor || "",
                          parts: r.parts || "",
                          mileage: r.mileage ?? undefined,
                          remark: r.remark || "",
                          attachmentKey: r.attachmentKey || "",
                        });
                        setOpen(true);
                      }}
                    />
                  </Tooltip>
                ) : null}
                {canDelete ? (
                  <Popconfirm title="确认删除该记录？" onConfirm={() => remove(r.id)}>
                    <Tooltip title="删除">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} className="ve-delete-btn" />
                    </Tooltip>
                  </Popconfirm>
                ) : null}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "编辑维保记录" : "新增维保记录"}
        open={open}
        width={920}
        className="ve-maintenance-modal"
        style={{ top: 24 }}
        onCancel={() => setOpen(false)}
        onOk={submit}
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto" },
          footer: { position: "sticky", bottom: 0, marginTop: 0, background: "#fff", zIndex: 2, paddingTop: 12 },
        }}
      >
        <Form form={form} layout="vertical">
          <Tabs
            items={[
              {
                key: "basic",
                label: "基础信息",
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="关联类型" name="targetType" initialValue="vehicle" rules={[{ required: true }]}>
                        <Select options={[{ value: "vehicle", label: "车辆" }, { value: "equipment", label: "通用设备" }]} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) =>
                          getFieldValue("targetType") === "vehicle" ? (
                            <Form.Item label="车辆" name="vehicleId" rules={[{ required: true }]}>
                              <Select options={vehicles.map((v) => ({ value: v.id, label: `${v.plateNo} / ${v.brandModel}` }))} showSearch optionFilterProp="label" />
                            </Form.Item>
                          ) : (
                            <Form.Item label="设备名称" name="equipmentName" rules={[{ required: true }]}>
                              <Input />
                            </Form.Item>
                          )
                        }
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="维保类型" name="maintenanceType" initialValue="routine" rules={[{ required: true }]}>
                        <Select options={maintenanceTypeOptions} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="维保日期" name="maintenanceDate" rules={[{ required: true }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="维保项目" name="itemDesc" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "cost",
                label: "费用与备注",
                children: (
                  <Row gutter={16}>
                    <Col span={12}><Form.Item label="费用" name="cost" rules={[{ required: true }]}><InputNumber min={0} className="w-full" /></Form.Item></Col>
                    <Col span={12}><Form.Item label="本次里程（车辆必填）" name="mileage"><InputNumber min={0} className="w-full" /></Form.Item></Col>
                    <Col span={12}><Form.Item label="维修单位" name="vendor"><Input /></Form.Item></Col>
                    <Col span={12}><Form.Item label="配件/耗材" name="parts"><Input /></Form.Item></Col>
                    <Col span={24}><Form.Item label="备注" name="remark"><Input.TextArea rows={3} /></Form.Item></Col>
                  </Row>
                ),
              },
              {
                key: "attachment",
                label: "附件",
                children: (
                  <>
                    <Form.Item label="附件Key" name="attachmentKey"><Input /></Form.Item>
                    <Button
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.onchange = async () => {
                          const file = input.files?.[0];
                          if (file) await onPickFile(file);
                        };
                        input.click();
                      }}
                    >
                      上传附件
                    </Button>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
}

