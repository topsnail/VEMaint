import { Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tabs, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { apiFetch, uploadFile } from "../lib/http";
import type { MaintenanceRecord, Vehicle } from "../types";

type FormModel = {
  targetType: "vehicle" | "equipment";
  vehicleId?: string;
  equipmentName?: string;
  maintenanceType: "routine" | "fault" | "accident" | "periodic";
  maintenanceDate: string;
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

  const maintenanceTypeDefaults = ["日常保养", "故障维修", "事故维修", "定期检修"];
  const maintenanceTypeCodes: FormModel["maintenanceType"][] = ["routine", "fault", "accident", "periodic"];
  const maintenanceTypeLabels = dropdowns.maintenanceType && dropdowns.maintenanceType.length > 0 ? dropdowns.maintenanceType : maintenanceTypeDefaults;
  const maintenanceTypeOptions = maintenanceTypeCodes.map((code, idx) => ({
    value: code,
    label: maintenanceTypeLabels[idx] ?? maintenanceTypeDefaults[idx],
  }));

  const submit = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
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
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {canEdit ? (
          <Button
            type="primary"
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
        className="ve-table"
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
                <a href={`/api/files/${encodeURIComponent(r.attachmentKey)}`} target="_blank" rel="noreferrer">
                  查看
                </a>
              ) : (
                "-"
              ),
          },
          {
            title: "操作",
            render: (_, r) => (
              <Space>
                {canEdit ? (
                  <Button
                    size="small"
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({
                        vehicleId: r.vehicleId ?? undefined,
                        targetType: r.targetType,
                        equipmentName: r.equipmentName || "",
                        maintenanceType: r.maintenanceType,
                        maintenanceDate: r.maintenanceDate,
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
                  >
                    编辑
                  </Button>
                ) : null}
                {canDelete ? (
                  <Popconfirm title="确认删除该记录？" onConfirm={() => remove(r.id)}>
                    <Button size="small" danger>
                      删除
                    </Button>
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
                        <DatePicker className="w-full" format="YYYY-MM-DD" valueFormat="YYYY-MM-DD" />
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

