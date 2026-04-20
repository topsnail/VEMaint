import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { App, AutoComplete, Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Skeleton, Space, Table, Tabs, Tooltip } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "../components/PageContainer";
import { R2AttachmentUploader } from "../components/R2AttachmentUploader";
import { useMaintenancePageData } from "../hooks/useMaintenancePageData";
import { getUser } from "../lib/auth";
import { openProtectedFile } from "../lib/http";
import { listTableScroll, listTableSticky } from "../lib/tableConfig";
import type { MaintenanceRecord, Vehicle } from "../types";

type FormModel = {
  targetType: "vehicle" | "equipment" | "other";
  vehicleId?: string;
  equipmentName?: string;
  equipmentType?: string;
  equipmentCategory?: string;
  equipmentLocation?: string;
  maintenanceType: "routine" | "fault" | "accident" | "periodic";
  maintenanceDate: string | Dayjs;
  itemDesc: string;
  itemDescOther?: string;
  cost: number;
  vendor?: string;
  parts?: string;
  mileage?: number;
  remark?: string;
  laborCost?: number;
  materialCost?: number;
  miscCost?: number;
  resultStatus?: "resolved" | "temporary" | "pending";
  partDetails?: Array<{
    partName?: string;
    spec?: string;
    unit?: string;
    qty?: number;
    unitPrice?: number;
  }>;
  attachmentKey?: string | null;
};

const COST_META_PREFIX = "__COST_META__:";
const EQUIP_META_PREFIX = "__EQUIP_META__:";
const MAINT_META_PREFIX = "__MAINT_META__:";

export function MaintenancePage({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const { message } = App.useApp();
  const currentUserName = getUser()?.username ?? "当前用户";
  const { rows, vehicles, dropdowns, loading: pageLoading, load, loadDropdowns, removeRecord, saveRecord } = useMaintenancePageData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [form] = Form.useForm<FormModel>();

  useEffect(() => {
    void load();
    void loadDropdowns();
  }, [load, loadDropdowns]);

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
  const itemDescOptions = [
    { value: "保养", label: "保养" },
    { value: "维修", label: "维修" },
    { value: "其他", label: "其他" },
  ];
  const resultStatusOptions = [
    { value: "resolved", label: "已修复" },
    { value: "temporary", label: "临时处理" },
    { value: "pending", label: "待复查" },
  ];
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
  const equipmentNameOptions = normalizeDropdownOptions(dropdowns.equipmentName, ["空压机", "发电机", "液压泵", "叉车", "其他设备"]).map((v) => ({
    label: v,
    value: v,
  }));
  const equipmentTypeOptions = normalizeDropdownOptions(dropdowns.equipmentType, ["动力设备", "液压设备", "搬运设备", "电气设备", "其他"]).map((v) => ({
    label: v,
    value: v,
  }));
  const equipmentCategoryOptions = normalizeDropdownOptions(dropdowns.equipmentCategory, ["生产", "保障", "检测", "安防", "其他"]).map((v) => ({
    label: v,
    value: v,
  }));
  const equipmentLocationOptions = normalizeDropdownOptions(dropdowns.equipmentLocation, ["一号车间", "二号车间", "仓库", "停车场", "其他"]).map((v) => ({
    label: v,
    value: v,
  }));

  const parseRemarkAndCostMeta = (raw: string | null | undefined) => {
    const text = (raw ?? "").trim();
    if (!text)
      return {
        remark: "",
        laborCost: undefined,
        materialCost: undefined,
        miscCost: undefined,
        equipmentType: undefined,
        equipmentCategory: undefined,
        equipmentLocation: undefined,
        resultStatus: undefined,
        partDetails: [] as FormModel["partDetails"],
      };
    const lines = text.split("\n");
    const metaLine = lines.find((line) => line.startsWith(COST_META_PREFIX));
    const equipMetaLine = lines.find((line) => line.startsWith(EQUIP_META_PREFIX));
    const maintMetaLine = lines.find((line) => line.startsWith(MAINT_META_PREFIX));
    const visibleRemark = lines
      .filter((line) => !line.startsWith(COST_META_PREFIX) && !line.startsWith(EQUIP_META_PREFIX) && !line.startsWith(MAINT_META_PREFIX))
      .join("\n")
      .trim();
    const parsedCost = { laborCost: undefined as number | undefined, materialCost: undefined as number | undefined, miscCost: undefined as number | undefined };
    const parsedEquip = { equipmentType: undefined as string | undefined, equipmentCategory: undefined as string | undefined, equipmentLocation: undefined as string | undefined };
    const parsedMaint = {
      resultStatus: undefined as FormModel["resultStatus"],
      partDetails: [] as FormModel["partDetails"],
    };
    const metaJson = metaLine?.slice(COST_META_PREFIX.length).trim();
    try {
      if (metaJson) {
        const parsed = JSON.parse(metaJson) as { laborCost?: unknown; materialCost?: unknown; miscCost?: unknown };
        const toNumberOrUndefined = (v: unknown) => {
          if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
          return v;
        };
        parsedCost.laborCost = toNumberOrUndefined(parsed.laborCost);
        parsedCost.materialCost = toNumberOrUndefined(parsed.materialCost);
        parsedCost.miscCost = toNumberOrUndefined(parsed.miscCost);
      }
    } catch {
      // ignore malformed meta
    }
    const equipMetaJson = equipMetaLine?.slice(EQUIP_META_PREFIX.length).trim();
    try {
      if (equipMetaJson) {
        const parsed = JSON.parse(equipMetaJson) as {
          equipmentType?: unknown;
          equipmentCategory?: unknown;
          equipmentLocation?: unknown;
        };
        const toStringOrUndefined = (v: unknown) => {
          const textValue = String(v ?? "").trim();
          return textValue || undefined;
        };
        parsedEquip.equipmentType = toStringOrUndefined(parsed.equipmentType);
        parsedEquip.equipmentCategory = toStringOrUndefined(parsed.equipmentCategory);
        parsedEquip.equipmentLocation = toStringOrUndefined(parsed.equipmentLocation);
      }
    } catch {
      // ignore malformed meta
    }
    const maintMetaJson = maintMetaLine?.slice(MAINT_META_PREFIX.length).trim();
    try {
      if (maintMetaJson) {
        const parsed = JSON.parse(maintMetaJson) as {
          resultStatus?: unknown;
          partDetails?: unknown;
        };
        if (parsed.resultStatus === "resolved" || parsed.resultStatus === "temporary" || parsed.resultStatus === "pending") {
          parsedMaint.resultStatus = parsed.resultStatus;
        }
        if (Array.isArray(parsed.partDetails)) {
          parsedMaint.partDetails = parsed.partDetails
            .filter((x) => x && typeof x === "object")
            .map((x) => {
              const row = x as { partName?: unknown; spec?: unknown; unit?: unknown; qty?: unknown; unitPrice?: unknown };
              return {
                partName: String(row.partName ?? "").trim(),
                spec: String(row.spec ?? "").trim(),
                unit: String(row.unit ?? "").trim(),
                qty: typeof row.qty === "number" && Number.isFinite(row.qty) && row.qty >= 0 ? row.qty : undefined,
                unitPrice: typeof row.unitPrice === "number" && Number.isFinite(row.unitPrice) && row.unitPrice >= 0 ? row.unitPrice : undefined,
              };
            });
        }
      }
    } catch {
      // ignore malformed meta
    }
    return { remark: visibleRemark, ...parsedCost, ...parsedEquip, ...parsedMaint };
  };

  const joinRemarkWithMeta = (params: {
    remark?: string;
    laborCost?: number;
    materialCost?: number;
    miscCost?: number;
    equipmentType?: string;
    equipmentCategory?: string;
    equipmentLocation?: string;
    resultStatus?: FormModel["resultStatus"];
    partDetails?: FormModel["partDetails"];
  }) => {
    const {
      remark,
      laborCost,
      materialCost,
      miscCost,
      equipmentType,
      equipmentCategory,
      equipmentLocation,
      resultStatus,
      partDetails,
    } = params;
    const cleanRemark = (remark ?? "").trim();
    const hasBreakdown = [laborCost, materialCost, miscCost].some((v) => typeof v === "number" && Number.isFinite(v) && v >= 0);
    const hasEquipMeta = [equipmentType, equipmentCategory, equipmentLocation].some((v) => !!String(v ?? "").trim());
    const cleanParts =
      partDetails
        ?.map((row) => ({
          partName: String(row?.partName ?? "").trim(),
          spec: String(row?.spec ?? "").trim(),
          unit: String(row?.unit ?? "").trim(),
          qty: typeof row?.qty === "number" && Number.isFinite(row.qty) && row.qty >= 0 ? row.qty : undefined,
          unitPrice: typeof row?.unitPrice === "number" && Number.isFinite(row.unitPrice) && row.unitPrice >= 0 ? row.unitPrice : undefined,
        }))
        .filter((row) => row.partName || row.spec || row.unit || typeof row.qty === "number" || typeof row.unitPrice === "number") ?? [];
    const hasMaintMeta =
      !!resultStatus ||
      cleanParts.length > 0;
    const lines: string[] = [];
    if (cleanRemark) lines.push(cleanRemark);
    if (hasBreakdown) {
      lines.push(
        `${COST_META_PREFIX}${JSON.stringify({
          laborCost: typeof laborCost === "number" && Number.isFinite(laborCost) ? laborCost : undefined,
          materialCost: typeof materialCost === "number" && Number.isFinite(materialCost) ? materialCost : undefined,
          miscCost: typeof miscCost === "number" && Number.isFinite(miscCost) ? miscCost : undefined,
        })}`,
      );
    }
    if (hasEquipMeta) {
      lines.push(
        `${EQUIP_META_PREFIX}${JSON.stringify({
          equipmentType: String(equipmentType ?? "").trim() || undefined,
          equipmentCategory: String(equipmentCategory ?? "").trim() || undefined,
          equipmentLocation: String(equipmentLocation ?? "").trim() || undefined,
        })}`,
      );
    }
    if (hasMaintMeta) {
      lines.push(
        `${MAINT_META_PREFIX}${JSON.stringify({
          resultStatus: resultStatus || undefined,
          partDetails: cleanParts.length > 0 ? cleanParts : undefined,
        })}`,
      );
    }
    return lines.length > 0 ? lines.join("\n") : null;
  };

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
    if (!maintenanceDate) {
      message.error("维保日期无效");
      return;
    }
    const partsSubtotal = (v.partDetails ?? []).reduce((sum, row) => sum + Number(row?.qty ?? 0) * Number(row?.unitPrice ?? 0), 0);
    const hasBreakdown = [v.laborCost, v.materialCost, v.miscCost].some((x) => typeof x === "number" && Number.isFinite(x));
    const effectiveMaterial = (v.partDetails?.length ?? 0) > 0 ? partsSubtotal : Number(v.materialCost ?? 0);
    const mergedCost = hasBreakdown ? Number(v.laborCost ?? 0) + effectiveMaterial + Number(v.miscCost ?? 0) : Number(v.cost ?? 0);
    if (!Number.isFinite(mergedCost) || mergedCost < 0) {
      message.error("费用金额无效");
      return;
    }
    const itemDesc = v.itemDesc === "其他" ? (v.itemDescOther ?? "").trim() || "其他" : v.itemDesc;
    const payload = {
      targetType: v.targetType,
      vehicleId: v.targetType === "vehicle" ? v.vehicleId : null,
      equipmentName: v.targetType === "vehicle" ? null : (v.equipmentName || null),
      maintenanceType: v.maintenanceType,
      maintenanceDate,
      itemDesc,
      cost: mergedCost,
      vendor: v.vendor || null,
      parts: v.parts || null,
      mileage: v.targetType === "vehicle" ? (v.mileage ?? null) : null,
      remark: joinRemarkWithMeta({
        remark: v.remark,
        laborCost: v.laborCost,
        materialCost: effectiveMaterial,
        miscCost: v.miscCost,
        equipmentType: v.targetType === "equipment" ? v.equipmentType : undefined,
        equipmentCategory: v.targetType === "equipment" ? v.equipmentCategory : undefined,
        equipmentLocation: v.targetType === "equipment" ? v.equipmentLocation : undefined,
        resultStatus: v.resultStatus,
        partDetails: v.partDetails,
      }),
      attachmentKey: v.attachmentKey || null,
    };
    const res = await saveRecord(editing?.id ?? null, payload);
    if (!res.ok) return message.error(res.error.message);
    message.success("保存成功");
    setOpen(false);
    setEditing(null);
    form.resetFields();
    await load();
  };

  const remove = async (id: string) => {
    const res = await removeRecord(id);
    if (!res.ok) return message.error(res.error.message);
    message.success("删除成功");
    await load();
  };

  const viewAttachment = async (attachmentKey: string) => {
    const res = await openProtectedFile(`/files/${encodeURIComponent(attachmentKey)}`);
    if (!res.ok) message.error(res.error.message);
  };

  const parsedRemarkMap = useMemo(() => new Map(rows.map((row) => [row.id, parseRemarkAndCostMeta(row.remark)])), [rows]);

  const maintenanceSummary = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          const parsed = parsedRemarkMap.get(r.id);
          const partRows = parsed?.partDetails ?? [];
          const count = partRows.filter((x) => !!String(x?.partName ?? "").trim()).length;
          const amount = partRows.reduce((sum, x) => sum + Number(x?.qty ?? 0) * Number(x?.unitPrice ?? 0), 0);
          acc.partsKinds += count;
          acc.partsAmount += amount;
          return acc;
        },
        { partsKinds: 0, partsAmount: 0 },
      ),
    [rows, parsedRemarkMap],
  );

  return (
    <PageContainer
      title="维保记录"
      breadcrumb={[
        { title: "首页", path: "/" },
        { title: "维保记录" },
      ]}
      extra={
        canEdit ? (
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
        ) : undefined
      }
    >
      <div className="ve-maintenance-page space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-main border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-sm">
          <div className="text-[#64748b]">配件种类总数</div>
          <div className="text-lg font-semibold text-[#1f2937]">{maintenanceSummary.partsKinds}</div>
        </div>
        <div className="rounded-main border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-sm">
          <div className="text-[#64748b]">配件金额汇总</div>
          <div className="text-lg font-semibold text-[#1f2937]">¥{maintenanceSummary.partsAmount.toFixed(2)}</div>
        </div>
      </div>
      {pageLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
      <Table
        className="ve-maintenance-table ve-table"
        size="small"
        tableLayout="auto"
        rowKey="id"
        dataSource={rows}
        scroll={listTableScroll}
        sticky={listTableSticky}
        columns={[
          { title: "车牌号", dataIndex: "plateNo" },
          { title: "车辆", dataIndex: "brandModel" },
          { title: "维保日期", dataIndex: "maintenanceDate" },
          { title: "项目", dataIndex: "itemDesc" },
          { title: "费用", dataIndex: "cost" },
          {
            title: "配件种类",
            render: (_, r) => {
              const parsed = parsedRemarkMap.get(r.id);
              const count = (parsed?.partDetails ?? []).filter((x) => !!String(x?.partName ?? "").trim()).length;
              return count || "-";
            },
          },
          {
            title: "配件金额",
            render: (_, r) => {
              const parsed = parsedRemarkMap.get(r.id);
              const amount = (parsed?.partDetails ?? []).reduce((sum, x) => sum + Number(x?.qty ?? 0) * Number(x?.unitPrice ?? 0), 0);
              return amount > 0 ? `¥${amount.toFixed(2)}` : "-";
            },
          },
          { title: "维修单位", dataIndex: "vendor" },
          {
            title: "附件",
            render: (_, r) =>
              r.attachmentKey ? (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    void viewAttachment(r.attachmentKey!);
                  }}
                  className="ve-link"
                >
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
                        const parsed = parsedRemarkMap.get(r.id) ?? parseRemarkAndCostMeta(r.remark);
                        setEditing(r);
                        const isPresetItemDesc = itemDescOptions.some((x) => x.value === r.itemDesc);
                        form.setFieldsValue({
                          vehicleId: r.vehicleId ?? undefined,
                          targetType: r.targetType,
                          equipmentName: r.equipmentName || "",
                          maintenanceType: r.maintenanceType,
                          maintenanceDate: r.maintenanceDate ? dayjs(r.maintenanceDate) : undefined,
                          itemDesc: isPresetItemDesc ? r.itemDesc : "其他",
                          itemDescOther: isPresetItemDesc ? "" : r.itemDesc,
                          cost: r.cost,
                          vendor: r.vendor || "",
                          parts: r.parts || "",
                          mileage: r.mileage ?? undefined,
                          remark: parsed.remark,
                          laborCost: parsed.laborCost,
                          materialCost: parsed.materialCost,
                          miscCost: parsed.miscCost,
                          resultStatus: parsed.resultStatus,
                          partDetails: parsed.partDetails,
                          equipmentType: parsed.equipmentType,
                          equipmentCategory: parsed.equipmentCategory,
                          equipmentLocation: parsed.equipmentLocation,
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
      )}

      <Modal
        title={editing ? "编辑维保记录" : "新增维保记录"}
        open={open}
        centered
        width={920}
        className="ve-maintenance-modal"
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
                        <Select
                          options={[
                            { value: "vehicle", label: "车辆" },
                            { value: "equipment", label: "设备" },
                            { value: "other", label: "其他" },
                          ]}
                          placeholder="请选择关联类型"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) =>
                          getFieldValue("targetType") === "vehicle" ? (
                            <Form.Item label="车辆" name="vehicleId" rules={[{ required: true }]}>
                              <Select
                                options={vehicles.map((v) => ({ value: v.id, label: `${v.plateNo} / ${v.brandModel}` }))}
                                showSearch
                                optionFilterProp="label"
                                placeholder="搜索车牌或品牌型号"
                              />
                            </Form.Item>
                          ) : (
                            <Form.Item label="对象名称" name="equipmentName" rules={[{ required: true }]}>
                              <AutoComplete
                                className="w-full"
                                options={equipmentNameOptions}
                                placeholder="请选择或输入设备/其他对象名称"
                                filterOption={(inputValue, option) =>
                                  (option?.value ?? "").toString().toLowerCase().includes(inputValue.trim().toLowerCase())
                                }
                              />
                            </Form.Item>
                          )
                        }
                      </Form.Item>
                    </Col>
                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldValue }) =>
                        getFieldValue("targetType") === "equipment" ? (
                          <>
                            <Col span={12}>
                              <Form.Item label="设备类型" name="equipmentType">
                                <Select allowClear options={equipmentTypeOptions} placeholder="选择设备类型（可选）" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="设备分类" name="equipmentCategory">
                                <Select allowClear options={equipmentCategoryOptions} placeholder="选择设备分类（可选）" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="设备位置" name="equipmentLocation">
                                <Select allowClear options={equipmentLocationOptions} placeholder="选择设备位置（可选）" />
                              </Form.Item>
                            </Col>
                          </>
                        ) : null
                      }
                    </Form.Item>
                    <Col span={12}>
                      <Form.Item label="维保类型" name="maintenanceType" initialValue="routine" rules={[{ required: true }]}>
                        <Select options={maintenanceTypeOptions} placeholder="请选择维保类型" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="维保日期" name="maintenanceDate" rules={[{ required: true }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择维保日期" />
                      </Form.Item>
                    </Col>
                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldValue }) =>
                        getFieldValue("targetType") === "vehicle" ? (
                          <Col span={12}>
                            <Form.Item label="本次里程（车辆必填）" name="mileage" rules={[{ required: true, message: "车辆维保请填写本次里程" }]}>
                              <InputNumber min={0} className="w-full" placeholder="请输入本次里程（km）" />
                            </Form.Item>
                          </Col>
                        ) : null
                      }
                    </Form.Item>
                  </Row>
                ),
              },
              {
                key: "cost",
                label: "费用与备注",
                children: (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item noStyle shouldUpdate>
                        {() => {
                          const labor = Number(form.getFieldValue("laborCost") ?? 0);
                          const material = Number(form.getFieldValue("materialCost") ?? 0);
                          const misc = Number(form.getFieldValue("miscCost") ?? 0);
                          const partRows = (form.getFieldValue("partDetails") ?? []) as FormModel["partDetails"];
                          const partAmount = (partRows ?? []).reduce((sum, row) => sum + Number(row?.qty ?? 0) * Number(row?.unitPrice ?? 0), 0);
                          const effectiveMaterial = (partRows?.length ?? 0) > 0 ? partAmount : material;
                          const total = labor + effectiveMaterial + misc;
                          const isVehicle = form.getFieldValue("targetType") === "vehicle";
                          const materialLabel = isVehicle ? "配件" : "更换部件";
                          const laborLabel = isVehicle ? "工时" : "工时（小时）";
                          const miscLabel = isVehicle ? "其他" : "其他费用";
                          const remarkPlaceholder = isVehicle ? "车辆维保补充说明" : "设备/其他对象维保补充说明";
                          const quickTemplates = isVehicle
                            ? ["更换机油机滤", "更换刹车片", "四轮定位/动平衡"]
                            : ["更换滤芯", "电路排查", "润滑保养"];
                          return (
                            <div className="mb-4 rounded-main border border-[#e5e7eb] bg-[#fafafa] px-3 py-3">
                              <Row gutter={12}>
                                <Col span={8}>
                                  <Form.Item label="项目" name="itemDesc" rules={[{ required: true, message: "请选择维保项目" }]} className="!mb-3">
                                    <Select options={itemDescOptions} placeholder="请选择项目" />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item label={materialLabel} name="materialCost" className="!mb-3">
                                    <InputNumber min={0} precision={2} className="w-full" placeholder={isVehicle ? "配件费" : "部件/耗材费"} />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item label={laborLabel} name="laborCost" className="!mb-3">
                                    <InputNumber min={0} precision={2} className="w-full" placeholder={isVehicle ? "工时费" : "人工/停机工时费"} />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item label={miscLabel} name="miscCost" className="!mb-1">
                                    <InputNumber min={0} precision={2} className="w-full" placeholder="其他费" />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item label="合计" className="!mb-1">
                                    <Input readOnly value={`¥${Number.isFinite(total) ? total.toFixed(2) : "0.00"}`} />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item label="总计" name="cost" rules={[{ required: true, message: "请输入总费用" }]} className="!mb-1">
                                    <InputNumber min={0} precision={2} className="w-full" placeholder="总费用" />
                                  </Form.Item>
                                </Col>
                                <Col span={6}>
                                  <Form.Item label="维保人" className="!mb-0">
                                    <Input readOnly value={currentUserName} />
                                  </Form.Item>
                                </Col>
                                <Col span={6}>
                                  <Form.Item label="处理结果" name="resultStatus" className="!mb-0">
                                    <Select allowClear options={resultStatusOptions} placeholder="请选择" />
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item label="备注" name="remark" className="!mb-0">
                                    <Input placeholder={remarkPlaceholder} />
                                  </Form.Item>
                                </Col>
                                <Col span={24}>
                                  <Space wrap size={[8, 8]} className="mt-0.5">
                                    {quickTemplates.map((tpl) => (
                                      <Button
                                        key={tpl}
                                        size="small"
                                        onClick={() => {
                                          const current = String(form.getFieldValue("remark") ?? "").trim();
                                          form.setFieldValue("remark", [current, tpl].filter(Boolean).join("；"));
                                        }}
                                      >
                                        + {tpl}
                                      </Button>
                                    ))}
                                  </Space>
                                </Col>
                                <Col span={24}>
                                  <Form.List name="partDetails">
                                    {(fields, { add, remove }) => (
                                      <div className="mt-0.5 w-full rounded-main border border-[#e5e7eb] bg-white px-3 py-2">
                                        <div className="mb-2 flex items-center justify-between">
                                          <span className="text-sm font-medium text-[#334155]">配件明细</span>
                                          <Button size="small" onClick={() => add()}>
                                            新增配件
                                          </Button>
                                        </div>
                                        <div className="space-y-1">
                                          {fields.map((field) => (
                                            <Row key={field.key} gutter={8} align="middle">
                                              <Col span={5}>
                                                <Form.Item {...field} name={[field.name, "partName"]} className="!mb-0">
                                                  <Input placeholder="名称" />
                                                </Form.Item>
                                              </Col>
                                              <Col span={4}>
                                                <Form.Item {...field} name={[field.name, "spec"]} className="!mb-0">
                                                  <Input placeholder="规格" />
                                                </Form.Item>
                                              </Col>
                                              <Col span={3}>
                                                <Form.Item {...field} name={[field.name, "unit"]} className="!mb-0">
                                                  <Input placeholder="单位" />
                                                </Form.Item>
                                              </Col>
                                              <Col span={3}>
                                                <Form.Item {...field} name={[field.name, "qty"]} className="!mb-0">
                                                  <InputNumber min={0} className="w-full" placeholder="数量" />
                                                </Form.Item>
                                              </Col>
                                              <Col span={4}>
                                                <Form.Item {...field} name={[field.name, "unitPrice"]} className="!mb-0">
                                                  <InputNumber min={0} precision={2} className="w-full" placeholder="单价" />
                                                </Form.Item>
                                              </Col>
                                              <Col span={4}>
                                                <Form.Item noStyle shouldUpdate>
                                                  {() => {
                                                    const qty = Number(form.getFieldValue(["partDetails", field.name, "qty"]) ?? 0);
                                                    const price = Number(form.getFieldValue(["partDetails", field.name, "unitPrice"]) ?? 0);
                                                    return <Input readOnly value={`¥${(qty * price).toFixed(2)}`} />;
                                                  }}
                                                </Form.Item>
                                              </Col>
                                              <Col span={1}>
                                                <Button danger type="text" onClick={() => remove(field.name)}>
                                                  删
                                                </Button>
                                              </Col>
                                            </Row>
                                          ))}
                                        </div>
                                        <div className="mt-1 text-right text-sm text-[#64748b]">配件明细合计：¥{partAmount.toFixed(2)}</div>
                                      </div>
                                    )}
                                  </Form.List>
                                </Col>
                              </Row>
                              <div className="mt-3 flex justify-end">
                                <Button size="small" onClick={() => form.setFieldValue("cost", Number.isFinite(total) ? total : 0)}>
                                  用合计覆盖总计
                                </Button>
                              </div>
                            </div>
                          );
                        }}
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) =>
                          getFieldValue("itemDesc") === "其他" ? (
                            <Form.Item
                              label="项目补充说明"
                              name="itemDescOther"
                              rules={[{ required: true, message: "请选择“其他”时请补充说明具体项目" }]}
                            >
                              <Input placeholder="请输入具体维保项目，例如：线路排查、结构焊补等" />
                            </Form.Item>
                          ) : null
                        }
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "attachment",
                label: "附件",
                children: (
                  <>
                    <Form.Item label="附件Key" name="attachmentKey">
                      <Input placeholder="上传后自动填充，或可手动填写" />
                    </Form.Item>
                    <Form.Item label="上传附件">
                      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.attachmentKey !== cur.attachmentKey}>
                        {() => (
                          <R2AttachmentUploader
                            value={form.getFieldValue("attachmentKey")}
                            onUploaded={(key) => form.setFieldValue("attachmentKey", key)}
                          />
                        )}
                      </Form.Item>
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
    </PageContainer>
  );
}

