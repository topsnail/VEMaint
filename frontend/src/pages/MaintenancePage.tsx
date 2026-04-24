import { App, Button, Form, Input, Modal, Select, Skeleton, Space, Table, Tabs } from "@/components/ui/legacy";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MaintenanceBasicSection } from "../components/maintenance/MaintenanceBasicSection";
import { MaintenanceCostSection } from "../components/maintenance/MaintenanceCostSection";
import { PageContainer } from "../components/PageContainer";
import { R2AttachmentUploader } from "../components/R2AttachmentUploader";
import { AttachmentStatus } from "../components/AttachmentStatus";
import { AttachmentViewer } from "../components/AttachmentViewer";
import { AttachmentRefreshButton } from "../components/AttachmentRefreshButton";
import { useMaintenanceColumns } from "../hooks/useMaintenanceColumns";
import { useMaintenanceListView, type MaintenanceViewMode } from "../hooks/useMaintenanceListView";
import { useMaintenancePageData } from "../hooks/useMaintenancePageData";
import { getUser } from "../lib/auth";
import { openProtectedFile } from "../lib/http";
import { calcPartStats, joinRemarkMeta, parseRemarkMeta } from "../lib/maintenanceMeta";
import { maintenanceSubmitSchema } from "../lib/schemas";
import { listTableScroll, listTableSticky } from "../lib/tableConfig";
import { actionBtn } from "../lib/ui/buttonTokens";
import type { MaintenanceRecord } from "../types";
import { requestOperationReason } from "../lib/operationReason";
import { normalizeDropdownOptions } from "../lib/options";

type FormModel = {
  targetType: "vehicle" | "equipment" | "other";
  vehicleId?: string;
  equipmentName?: string;
  equipmentType?: string;
  equipmentCategory?: string;
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
  attachmentKeys?: string[];
};
const MAINT_EDIT_TAB_ORDER = ["basic", "cost", "attachment"] as const;

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
  const location = useLocation();
  const currentUserName = getUser()?.username ?? "当前用户";
  const { rows, setRows, vehicles, dropdowns, loading: pageLoading, savePending, removePending, load, loadDropdowns, removeRecord, saveRecord } = useMaintenancePageData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<MaintenanceRecord | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<MaintenanceRecord | null>(null);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [viewerPaths, setViewerPaths] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewAttachmentKeys, setViewAttachmentKeys] = useState<string[]>([]);
  const [editTab, setEditTab] = useState<(typeof MAINT_EDIT_TAB_ORDER)[number]>("basic");
  const [editDirty, setEditDirty] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [attachmentRefreshing, setAttachmentRefreshing] = useState(false);
  const viewRecordRef = useRef<MaintenanceRecord | null>(null);
  const viewerPersistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [form] = Form.useForm<FormModel>();
  const normalizeAttachmentKeys = (keys: Array<string | null | undefined>) =>
    keys
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .filter((k, idx, arr) => arr.indexOf(k) === idx)
      .slice(0, 50);
  const refreshEditAttachmentState = async () => {
    if (!editing) return;
    setAttachmentRefreshing(true);
    try {
      const latest = await load();
      const latestRecord = latest.rows.find((x) => x.id === editing.id);
      if (!latestRecord) return;
      const parsed = parseRemarkMeta(latestRecord.remark);
      const nextKeys = normalizeAttachmentKeys([
        ...parsed.attachmentKeys,
        latestRecord.attachmentKey,
      ]);
      form.setFieldValue("attachmentKeys", nextKeys);
      form.setFieldValue("attachmentKey", nextKeys[0] || "");
      message.success("附件状态已刷新");
    } finally {
      setAttachmentRefreshing(false);
    }
  };

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
  useEffect(() => {
    viewRecordRef.current = viewRecord;
  }, [viewRecord]);

  const listView = useMaintenanceListView({ rows, view });
  const { setSearchKeyword } = listView;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q")?.trim();
    if (!q) return;
    setSearchKeyword(q);
    params.delete("q");
    const next = params.toString();
    window.history.replaceState(null, "", `${location.pathname}${next ? `?${next}` : ""}${window.location.hash}`);
  }, [location.pathname, location.search, setSearchKeyword]);

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

  const closeEditModal = () => {
    setOpen(false);
    setEditDirty(false);
    setDiscardConfirmOpen(false);
    setEditTab("basic");
  };
  const requestCloseEditModal = () => {
    if (editDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeEditModal();
  };

  const submit = async (opts?: { continueCreate?: boolean }) => {
    try {
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
          resultStatus: v.resultStatus,
          partDetails: v.partDetails,
          attachmentKeys: v.attachmentKeys,
        }),
        attachmentKey: v.attachmentKey || null,
      };
      const res = await saveRecord(editing?.id ?? null, payload);
      if (!res.ok) return message.error(res.error.message);
      if (opts?.continueCreate && !editing) {
        message.success("已保存，可继续新增下一条");
        form.resetFields();
        form.setFieldValue("targetType", defaultCreateTargetType);
        setEditDirty(false);
        setEditTab("basic");
        await load();
        return;
      }
      message.success("保存成功");
      closeEditModal();
      setEditing(null);
      form.resetFields();
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "维保表单校验失败";
      message.error(msg);
    }
  };

  const remove = async (id: string) => {
    const reason = await requestOperationReason("请输入删除维保记录的理由");
    if (!reason) return false;
    const res = await removeRecord(id, reason);
    if (!res.ok) {
      message.error(res.error.message);
      return false;
    }
    message.success("删除成功");
    return true;
  };

  const openAttachmentViewer = (attachmentKeys: string[] | string) => {
    const keys = Array.isArray(attachmentKeys) ? attachmentKeys : [attachmentKeys];
    const ps = keys.filter(Boolean).map((k) => `/files/${encodeURIComponent(k)}`);
    setViewerPaths(ps);
    setViewerInitialIndex(0);
    setViewerPath(ps[0] || null);
  };
  const buildPayloadFromRecord = (record: MaintenanceRecord, nextAttachmentKeys: string[]) => {
    const parsed = parseRemarkMeta(record.remark);
    const payload = {
      targetType: record.targetType,
      vehicleId: record.targetType === "vehicle" ? record.vehicleId : null,
      equipmentName: record.targetType === "vehicle" ? null : (record.equipmentName || null),
      maintenanceType: record.maintenanceType,
      maintenanceDate: record.maintenanceDate,
      itemDesc: record.itemDesc,
      cost: Number(record.cost ?? 0),
      vendor: record.vendor || null,
      parts: record.parts || null,
      mileage: record.targetType === "vehicle" ? (record.mileage ?? null) : null,
      remark: joinRemarkMeta({
        remark: parsed.remark,
        laborCost: parsed.laborCost,
        materialCost: parsed.materialCost,
        miscCost: parsed.miscCost,
        equipmentType: parsed.equipmentType,
        equipmentCategory: parsed.equipmentCategory,
        resultStatus: parsed.resultStatus,
        partDetails: parsed.partDetails,
        attachmentKeys: nextAttachmentKeys,
      }),
      attachmentKey: nextAttachmentKeys[0] || null,
    };
    return payload;
  };
  const reconcileViewAttachmentState = async (recordId: string) => {
    const latest = await load();
    const latestRecord = latest.rows.find((x) => x.id === recordId);
    if (!latestRecord) return;
    const parsed = parseRemarkMeta(latestRecord.remark);
    const nextKeys = normalizeAttachmentKeys([
      ...parsed.attachmentKeys,
      latestRecord.attachmentKey,
    ]);
    setViewRecord(latestRecord);
    setViewAttachmentKeys(nextKeys);
    setRows((prev) => prev.map((x) => (x.id === recordId ? latestRecord : x)));
  };
  const persistViewAttachmentKeys = async (nextAttachmentKeys: string[]): Promise<boolean> => {
    const current = viewRecordRef.current;
    if (!current) return false;
    const normalized = normalizeAttachmentKeys(nextAttachmentKeys);
    const payload = buildPayloadFromRecord(current, normalized);
    const res = await saveRecord(current.id, payload);
    if (!res.ok) {
      message.error(res.error.message || "附件更新失败");
      return false;
    }
    await reconcileViewAttachmentState(current.id);
    return true;
  };

  const handleEditOpen = (record: MaintenanceRecord) => {
    setEditing(record);
    setEditDirty(false);
    setEditTab("basic");
    setOpen(true);
  };
  const handleViewOpen = (record: MaintenanceRecord) => {
    const latestRow = rows.find((x) => x.id === record.id) ?? record;
    const parsed = parseRemarkMeta(latestRow.remark);
    const nextKeys = normalizeAttachmentKeys([
      ...parsed.attachmentKeys,
      latestRow.attachmentKey,
    ]);
    setViewAttachmentKeys(nextKeys);
    setViewRecord(latestRow);
    setViewOpen(true);
  };
  const maintenanceTypeLabelMap = useMemo(
    () =>
      new Map<FormModel["maintenanceType"], string>(
        maintenanceTypeOptions.map((option) => [option.value as FormModel["maintenanceType"], option.label]),
      ),
    [maintenanceTypeOptions],
  );

  const parsedRemarkMap = useMemo(() => new Map(listView.visibleRows.map((row) => [row.id, parseRemarkMeta(row.remark)])), [listView.visibleRows]);

  const columns = useMaintenanceColumns({
    view,
    canEdit,
    canDelete,
    form,
    itemDescOptions,
    parsedRemarkMap,
    onViewOpen: handleViewOpen,
    onEditOpen: handleEditOpen,
    onDeleteRequest: (record) => {
      setPendingDeleteRecord(record);
    },
    onViewAttachment: (attachmentKey) => {
      openAttachmentViewer(attachmentKey);
    },
  });

  const pageTitle = view === "vehicle" ? "车辆维保" : view === "equipment" ? "设备维保" : "维保记录";
  const createBtnLabel = view === "equipment" ? "新增设备维保记录" : view === "vehicle" ? "新增车辆维保记录" : "新增维保记录";
  const editModalTitle = editing
    ? view === "equipment"
      ? "编辑设备维保记录"
      : view === "vehicle"
        ? "编辑车辆维保记录"
        : "编辑维保记录"
    : createBtnLabel;
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
            className={actionBtn.primary}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldValue("targetType", defaultCreateTargetType);
              setEditDirty(false);
              setEditTab("basic");
              setOpen(true);
            }}
          >
            {createBtnLabel}
          </Button>
        ) : undefined
      }
    >
      <div className="ve-maintenance-page space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className={
            view === "all"
              ? "grid w-full grid-cols-1 gap-2 md:grid-cols-[minmax(240px,2fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto]"
              : "grid w-full grid-cols-1 gap-2 md:grid-cols-[minmax(260px,2.2fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]"
          }
        >
          <Input.Search
            className="w-full"
            placeholder={view === "equipment" ? "搜索设备/项目/维修单位" : "搜索车牌/车辆/项目/维修单位"}
            value={listView.searchKeyword}
            onChange={(e) => listView.setSearchKeyword(e.target.value)}
            onSearch={(v) => listView.setSearchKeyword((v ?? "").trim())}
            allowClear
          />
          {view === "all" ? (
            <Select
              value={listView.filterTargetType || undefined}
              onChange={(v) => listView.setFilterTargetType(v ?? "")}
              placeholder="对象类型"
              allowClear
              options={[
                { label: "车辆", value: "vehicle" },
                { label: "设备", value: "equipment" },
                { label: "其他", value: "other" },
              ]}
            />
          ) : null}
          <Select
            value={listView.filterMaintenanceType || undefined}
            onChange={(v) => listView.setFilterMaintenanceType(v ?? "")}
            placeholder="维保类型"
            allowClear
            options={maintenanceTypeOptions}
          />
          <Select
            value={listView.filterVendor || undefined}
            onChange={(v) => listView.setFilterVendor(v ?? "")}
            placeholder="维修单位"
            allowClear
            options={listView.vendorFilterOptions}
          />
          <Button
            className={actionBtn.neutral}
            onClick={() => {
              listView.resetFilters();
            }}
          >
            重置筛选
          </Button>
        </div>
      </div>
      {pageLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <>
          <Table
            className="ve-maintenance-table ve-table"
            size="small"
            tableLayout="auto"
            rowKey="id"
            dataSource={listView.pagedRows}
            scroll={listTableScroll}
            sticky={listTableSticky}
            columns={columns}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
            <div className="text-slate-600">
              共 {listView.visibleRows.length} 条，当前第 {listView.page}/{listView.totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(listView.pageSize)}
                onChange={(v) => listView.setPageSize(Number(v))}
                options={[
                  { label: "10 / 页", value: "10" },
                  { label: "20 / 页", value: "20" },
                  { label: "50 / 页", value: "50" },
                ]}
                className="w-[110px]"
              />
              <Button className={actionBtn.smallNeutral} disabled={listView.page <= 1} onClick={() => listView.setPage((p) => Math.max(1, p - 1))}>
                上一页
              </Button>
              <Button
                className={actionBtn.smallNeutral}
                disabled={listView.page >= listView.totalPages}
                onClick={() => listView.setPage((p) => Math.min(listView.totalPages, p + 1))}
              >
                下一页
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        title={editModalTitle}
        open={open}
        centered
        width={920}
        className="ve-maintenance-modal"
        onCancel={requestCloseEditModal}
        footer={
          <Space size={8}>
            <Button className={actionBtn.neutral} onClick={requestCloseEditModal}>
              取消
            </Button>
            <Button
              className={actionBtn.secondary}
              onClick={() => {
                const idx = MAINT_EDIT_TAB_ORDER.indexOf(editTab);
                if (idx <= 0) return;
                setEditTab(MAINT_EDIT_TAB_ORDER[idx - 1]);
              }}
              disabled={MAINT_EDIT_TAB_ORDER.indexOf(editTab) <= 0}
            >
              上一步
            </Button>
            <Button
              className={actionBtn.secondary}
              onClick={() => {
                const idx = MAINT_EDIT_TAB_ORDER.indexOf(editTab);
                if (idx >= MAINT_EDIT_TAB_ORDER.length - 1) return;
                setEditTab(MAINT_EDIT_TAB_ORDER[idx + 1]);
              }}
              disabled={MAINT_EDIT_TAB_ORDER.indexOf(editTab) >= MAINT_EDIT_TAB_ORDER.length - 1}
            >
              下一步
            </Button>
            {!editing ? (
              <Button className={actionBtn.secondary} disabled={savePending} onClick={() => void submit({ continueCreate: true })}>
                保存并继续新增
              </Button>
            ) : null}
            <Button type="primary" className={actionBtn.primary} disabled={savePending} onClick={() => void submit()}>
              保存
            </Button>
          </Space>
        }
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto" },
          footer: { position: "sticky", bottom: 0, marginTop: 0, background: "#fff", zIndex: 2, paddingTop: 12 },
        }}
      >
        <Form form={form} layout="vertical" onValuesChange={() => setEditDirty(true)}>
          <Tabs
            activeKey={editTab}
            onChange={(k) => setEditTab(k as (typeof MAINT_EDIT_TAB_ORDER)[number])}
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
                    maintenanceTypeOptions={maintenanceTypeOptions}
                    fixedTargetType={view === "equipment" ? "equipment" : view === "vehicle" ? "vehicle" : undefined}
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
                    {editing ? (
                      <div className="mb-2 flex justify-end">
                        <AttachmentRefreshButton disabled={attachmentRefreshing} onClick={() => void refreshEditAttachmentState()} />
                      </div>
                    ) : null}
                    <Form.Item label="上传状态">
                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) =>
                          prev.attachmentKey !== cur.attachmentKey ||
                          JSON.stringify(prev.attachmentKeys ?? []) !== JSON.stringify(cur.attachmentKeys ?? [])
                        }
                      >
                        {() => (
                          (() => {
                            const n =
                              normalizeAttachmentKeys([
                                ...((form.getFieldValue("attachmentKeys") as string[] | undefined) ?? []),
                                form.getFieldValue("attachmentKey"),
                              ]).length;
                            return (
                          <AttachmentStatus
                            uploaded={n > 0}
                            count={n}
                          />
                            );
                          })()
                        )}
                      </Form.Item>
                    </Form.Item>
                    <Form.Item label="上传附件">
                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) =>
                          prev.attachmentKey !== cur.attachmentKey ||
                          JSON.stringify(prev.attachmentKeys ?? []) !== JSON.stringify(cur.attachmentKeys ?? [])
                        }
                      >
                        {() => (
                          <R2AttachmentUploader
                            value={form.getFieldValue("attachmentKey")}
                            keys={(form.getFieldValue("attachmentKeys") as string[] | undefined) ?? []}
                            onUploaded={(key) => {
                              form.setFieldValue("attachmentKey", key);
                              const prev = (form.getFieldValue("attachmentKeys") as string[] | undefined) ?? [];
                              const next = [...prev, key].map((x) => String(x ?? "").trim()).filter(Boolean);
                              const uniq = next.filter((k, idx) => next.indexOf(k) === idx);
                              form.setFieldValue("attachmentKeys", uniq.slice(0, 50));
                            }}
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
      <Modal
        title="放弃未保存修改？"
        open={discardConfirmOpen}
        centered
        onCancel={() => setDiscardConfirmOpen(false)}
        footer={
          <Space size={8}>
            <Button className={actionBtn.neutral} onClick={() => setDiscardConfirmOpen(false)}>
              继续编辑
            </Button>
            <Button
              type="primary"
              className={actionBtn.primary}
              onClick={() => {
                setDiscardConfirmOpen(false);
                closeEditModal();
              }}
            >
              放弃修改
            </Button>
          </Space>
        }
      >
        <div className="text-sm text-slate-700">当前有未保存内容，确认关闭并放弃本次修改吗？</div>
      </Modal>

      <Modal title="维保详情" open={viewOpen} centered width={860} onCancel={() => setViewOpen(false)} footer={null} className="ve-maintenance-modal">
        {viewRecord ? (
          <div className="space-y-3">
            {(() => {
              const parsed = parseRemarkMeta(viewRecord.remark);
              const partStats = calcPartStats(parsed.partDetails);
              const detailFields = [
                {
                  label: "对象类型",
                  value:
                    view === "equipment"
                      ? "设备"
                      : viewRecord.targetType === "vehicle"
                        ? "车辆"
                        : viewRecord.targetType === "equipment"
                          ? "设备"
                          : "其他",
                },
                { label: "维保日期", value: viewRecord.maintenanceDate || "-" },
                ...(viewRecord.targetType === "equipment"
                  ? [
                      { label: "设备名称", value: viewRecord.equipmentName || "-" },
                      { label: "设备类型", value: parsed.equipmentType || "-" },
                      { label: "设备分类", value: parsed.equipmentCategory || "-" },
                    ]
                  : [
                      { label: "车牌号", value: viewRecord.plateNo || "-" },
                      { label: "车辆/品牌", value: viewRecord.brandModel || "-" },
                    ]),
                {
                  label: "维保类型",
                  value: maintenanceTypeLabelMap.get(viewRecord.maintenanceType as FormModel["maintenanceType"]) || viewRecord.maintenanceType || "-",
                },
                { label: "项目", value: viewRecord.itemDesc || "-" },
                { label: "总费用", value: `¥${Number(viewRecord.cost ?? 0).toFixed(2)}` },
                { label: "维修单位", value: viewRecord.vendor || "-" },
              ];
              return (
                <>
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    {detailFields.map((f) => (
                      <div key={f.label} className="rounded-md border border-slate-200 bg-white p-2.5">
                        <div className="text-xs font-medium tracking-wide text-slate-500">{f.label}</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{f.value}</div>
                      </div>
                    ))}
                    <div className="rounded-md border border-slate-200 bg-white p-2.5">
                      <div className="text-xs font-medium tracking-wide text-slate-500">人工费用</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">¥{Number(parsed.laborCost ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-2.5">
                      <div className="text-xs font-medium tracking-wide text-slate-500">材料费用</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">¥{Number(parsed.materialCost ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-2.5">
                      <div className="text-xs font-medium tracking-wide text-slate-500">其他费用</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">¥{Number(parsed.miscCost ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-2.5">
                      <div className="text-xs font-medium tracking-wide text-slate-500">配件统计</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        种类 {partStats.count} 项，金额 ¥{partStats.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-2.5 md:col-span-2">
                      <div className="text-xs font-medium tracking-wide text-slate-500">备注</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{parsed.remark || "无备注"}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-2.5 md:col-span-2">
                      <div className="text-xs font-medium tracking-wide text-slate-500">附件状态</div>
                      <div className="mt-1">
                        <AttachmentStatus uploaded={viewAttachmentKeys.length > 0} count={viewAttachmentKeys.length} />
                      </div>
                    </div>
                  </div>
                  {viewAttachmentKeys.length > 0 ? (
                    <div className="flex justify-end">
                      <Button
                        className={actionBtn.secondary}
                        onClick={() => {
                          openAttachmentViewer(viewAttachmentKeys);
                        }}
                      >
                        查看附件
                      </Button>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : null}
      </Modal>

      <AttachmentViewer
        open={!!viewerPath}
        path={viewerPath}
        paths={viewerPaths}
        initialIndex={viewerInitialIndex}
        onPathsChange={(nextPaths) => {
          const toKey = (p: string) => {
            const raw = p.replace(/^\/files\//, "");
            try {
              return decodeURIComponent(raw);
            } catch {
              return raw;
            }
          };
          const nextKeys = normalizeAttachmentKeys(nextPaths.map(toKey));
          const prevKeys = viewAttachmentKeys;
          setViewAttachmentKeys(nextKeys);
          setViewRecord((prev) => (prev ? { ...prev, attachmentKey: nextKeys[0] || null } : prev));
          const run = async () => {
            const ok = await persistViewAttachmentKeys(nextKeys);
            if (ok) return;
            setViewAttachmentKeys(prevKeys);
            setViewRecord((prev) => (prev ? { ...prev, attachmentKey: prevKeys[0] || null } : prev));
          };
          viewerPersistQueueRef.current = viewerPersistQueueRef.current.then(run).catch(() => undefined);
        }}
        title="附件预览"
        onClose={() => {
          const closingId = viewRecordRef.current?.id;
          setViewerPath(null);
          setViewerPaths([]);
          setViewerInitialIndex(0);
          if (closingId) {
            viewerPersistQueueRef.current = viewerPersistQueueRef.current
              .then(async () => {
                await reconcileViewAttachmentState(closingId);
              })
              .catch(() => undefined);
          }
        }}
      />

      <Modal
        title="确认删除"
        open={!!pendingDeleteRecord}
        centered
        onCancel={() => setPendingDeleteRecord(null)}
        footer={
          <Space size={8}>
            <Button className={actionBtn.neutral} onClick={() => setPendingDeleteRecord(null)}>
              取消
            </Button>
            <Button
              type="primary"
              className={actionBtn.primary}
              disabled={removePending}
              onClick={() => {
                if (!pendingDeleteRecord) return;
                void (async () => {
                  const ok = await remove(pendingDeleteRecord.id);
                  if (ok) setPendingDeleteRecord(null);
                })();
              }}
            >
              确认删除
            </Button>
          </Space>
        }
      >
        <div className="text-sm text-slate-700">
          确认删除该维保记录吗？
          {pendingDeleteRecord ? (
            <div className="mt-2 text-xs text-slate-500">
              记录：{pendingDeleteRecord.maintenanceDate} / {pendingDeleteRecord.itemDesc} / ¥{Number(pendingDeleteRecord.cost ?? 0).toFixed(2)}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
    </PageContainer>
  );
}

