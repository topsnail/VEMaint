import { App, Button, Form, Input, Modal, Skeleton, Table, Tabs } from "@/components/ui/legacy";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { MaintenanceBasicSection } from "../components/maintenance/MaintenanceBasicSection";
import { MaintenanceCostSection } from "../components/maintenance/MaintenanceCostSection";
import { PageContainer } from "../components/PageContainer";
import { R2AttachmentUploader } from "../components/R2AttachmentUploader";
import { useMaintenanceColumns } from "../hooks/useMaintenanceColumns";
import { useMaintenancePageData } from "../hooks/useMaintenancePageData";
import { getUser } from "../lib/auth";
import { openProtectedFile } from "../lib/http";
import { calcPartStats, joinRemarkMeta, parseRemarkMeta } from "../lib/maintenanceMeta";
import { maintenanceSubmitSchema } from "../lib/schemas";
import { listTableScroll, listTableSticky } from "../lib/tableConfig";
import type { MaintenanceRecord } from "../types";

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

type MaintenanceViewMode = "all" | "vehicle" | "equipment";

export function MaintenancePage({
  canEdit,
  canDelete,
  view = "all",
}: {
  canEdit: boolean;
  canDelete: boolean;
  view?: MaintenanceViewMode;
}) {
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
    if (view === "vehicle" || view === "equipment") {
      form.setFieldValue("targetType", view);
    }
    setOpen(true);
    params.delete("create");
    const next = params.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [canEdit, form, view]);

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
    const validated = maintenanceSubmitSchema.safeParse({
      targetType: v.targetType,
      vehicleId: v.vehicleId,
      equipmentName: v.equipmentName,
      maintenanceType: v.maintenanceType,
      maintenanceDate,
      itemDesc,
      cost: mergedCost,
      mileage: v.mileage,
    });
    if (!validated.success) {
      message.error(validated.error.issues[0]?.message ?? "维保表单校验失败");
      return;
    }
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
      remark: joinRemarkMeta({
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

  const handleEditOpen = (record: MaintenanceRecord) => {
    setEditing(record);
    setOpen(true);
  };

  const visibleRows = useMemo(() => {
    if (view === "vehicle") return rows.filter((row) => row.targetType === "vehicle");
    if (view === "equipment") return rows.filter((row) => row.targetType === "equipment");
    return rows;
  }, [rows, view]);

  const parsedRemarkMap = useMemo(() => new Map(visibleRows.map((row) => [row.id, parseRemarkMeta(row.remark)])), [visibleRows]);

  const maintenanceSummary = useMemo(
    () =>
      visibleRows.reduce(
        (acc, r) => {
          const parsed = parsedRemarkMap.get(r.id);
          const partStats = calcPartStats(parsed?.partDetails);
          acc.partsKinds += partStats.count;
          acc.partsAmount += partStats.amount;
          return acc;
        },
        { partsKinds: 0, partsAmount: 0 },
      ),
    [parsedRemarkMap, visibleRows],
  );

  const columns = useMaintenanceColumns({
    canEdit,
    canDelete,
    form,
    itemDescOptions,
    parsedRemarkMap,
    onEditOpen: handleEditOpen,
    onDelete: (id) => {
      void remove(id);
    },
    onViewAttachment: (attachmentKey) => {
      void viewAttachment(attachmentKey);
    },
  });

  const pageTitle = view === "vehicle" ? "车辆维保" : view === "equipment" ? "设备维保" : "维保记录";
  const defaultCreateTargetType: FormModel["targetType"] = view === "vehicle" ? "vehicle" : view === "equipment" ? "equipment" : "vehicle";

  return (
    <PageContainer
      title={pageTitle}
      breadcrumb={[
        { title: "首页", path: "/" },
        { title: pageTitle },
      ]}
      extra={
        canEdit ? (
          <Button
            type="primary"
            className="ve-primary-btn"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldValue("targetType", defaultCreateTargetType);
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
        dataSource={visibleRows}
        scroll={listTableScroll}
        sticky={listTableSticky}
        columns={columns}
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
                  <MaintenanceBasicSection
                    form={form}
                    vehicles={vehicles}
                    equipmentNameOptions={equipmentNameOptions}
                    equipmentTypeOptions={equipmentTypeOptions}
                    equipmentCategoryOptions={equipmentCategoryOptions}
                    equipmentLocationOptions={equipmentLocationOptions}
                    maintenanceTypeOptions={maintenanceTypeOptions}
                  />
                ),
              },
              {
                key: "cost",
                label: "费用与备注",
                children: (
                  <MaintenanceCostSection
                    form={form}
                    currentUserName={currentUserName}
                    itemDescOptions={itemDescOptions}
                    resultStatusOptions={resultStatusOptions}
                  />
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

