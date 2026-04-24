import { App, AutoComplete, Button, Col, DatePicker, Descriptions, Dropdown, Form, Input, Modal, Row, Select, Skeleton, Space, Table, Tabs, Tooltip } from "@/components/ui/legacy";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm as useRhfForm } from "react-hook-form";
import type { Vehicle, VehicleCycle } from "../types";
import { R2AttachmentUploader } from "../components/R2AttachmentUploader";
import { AttachmentStatus } from "../components/AttachmentStatus";
import { useVehiclesTableData } from "../hooks/useVehiclesTableData";
import {
  fetchVehicleCycle,
  requestPutVehicleCycles,
  requestPutVehicleStatus,
  requestUpsertVehicle,
} from "../hooks/vehiclesApi";
import { PageContainer } from "../components/PageContainer";
import { StatusPill } from "../components/StatusPill";
import { vehicleSubmitSchema } from "../lib/schemas";
import { Eye, MoreHorizontal, Pencil, Trash2, Upload } from "lucide-react";
import { actionBtn } from "../lib/ui/buttonTokens";
import { AttachmentViewer } from "../components/AttachmentViewer";
import { AttachmentRefreshButton } from "../components/AttachmentRefreshButton";
import { requestOperationReason } from "../lib/operationReason";
import { normalizeDropdownOptions } from "../lib/options";
import { useMediaQuery } from "../lib/useMediaQuery";
import {
  buildInsurancePayload,
  calcAnnualExpiry,
  DEFAULT_ANNUAL_INTERVAL_MONTHS,
  FORM_FOCUSABLE_SELECTOR,
  type FormValidationError,
  MAX_ATTACHMENT_KEYS,
  normalizePositiveInteger,
  normalizePlateNo,
  parseInsuranceBundle,
  tabByFieldKey,
  toYmd,
  validateCycleInputs,
  validateInsuranceDraft,
  validateVehicleCoreInputs,
  VEHICLE_MODAL_SCROLL_WAIT_MS,
  VIN_LENGTH,
} from "./vehicles/helpers";
import { buildCycleSubmitPayload, buildMergedRemark, buildVehicleSubmitPayload } from "./vehicles/submit-service";
import { buildVehicleRemarkUpsertPayload, computeNextAttachmentMeta } from "./vehicles/attachment-service";

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
  drivingLicenseAttachmentKeys?: string[];
  insuranceType?: string;
  insuranceVendor?: string;
  insuranceCompulsoryVendor?: string;
  insuranceCompulsoryStart?: string;
  insuranceCompulsoryExpiry?: string;
  insuranceCommercialVendor?: string;
  insuranceCommercialStart?: string;
  insuranceCommercialExpiry?: string;
  insuranceStart?: string;
  insuranceExpiry?: string;
  insuranceAttachmentKey?: string;
  insuranceAttachmentKeys?: string[];
  insuranceCompulsoryAttachmentKeys?: string[];
  insuranceCommercialAttachmentKeys?: string[];
  annualLastDate?: string;
  annualExpiry?: string;
  maintLastDate?: string;
  maintIntervalDays?: number;
  maintIntervalKm?: number;
  maintNextDate?: string;
  maintNextKm?: number;
  annualIntervalMonths?: number;
  remark?: string;
};

/**
 * 新增车辆时节号默认值：地区简称 + 间隔号，便于在「相同前缀」下继续录入后半段（发牌代号+序号）。
 * 其他地区车辆可整段删除后重输；中间点仅为录入习惯，可按需保留或删除。
 */
const DEFAULT_PLATE_NO_PREFIX = "豫A·";
const EDIT_TAB_ORDER = ["basic", "insurance", "annual", "maint"] as const;

export function VehiclesPage({ canManage }: { canManage: boolean }) {
  const { message } = App.useApp();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const initialParams = new URLSearchParams(window.location.search);
  const { rows, setRows, cyclesByVehicleId, setCyclesByVehicleId, dropdowns, ownerDirectory, loading: listLoading, load, loadDropdowns } = useVehiclesTableData();
  const [q, setQ] = useState(() => initialParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);
  const [viewCycle, setViewCycle] = useState<VehicleCycle | null>(null);
  const [viewInsuranceKeys, setViewInsuranceKeys] = useState<string[]>([]);
  const [viewDrivingLicenseKeys, setViewDrivingLicenseKeys] = useState<string[]>([]);
  const [viewTab, setViewTab] = useState("base");
  const [editTab, setEditTab] = useState("basic");
  const [pendingScrap, setPendingScrap] = useState<Vehicle | null>(null);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [viewerPaths, setViewerPaths] = useState<string[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerSource, setViewerSource] = useState<"insuranceCompulsory" | "insuranceCommercial" | "driving" | "other">("other");
  const viewerPersistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const viewVehicleRef = useRef<Vehicle | null>(null);
  const [editScrollTarget, setEditScrollTarget] = useState<"insuranceUpload" | "drivingLicenseUpload" | null>(null);
  const editScrollWrapRef = useRef<HTMLDivElement | null>(null);
  const insuranceUploadRef = useRef<HTMLDivElement | null>(null);
  const drivingLicenseUploadRef = useRef<HTMLDivElement | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>(() => initialParams.get("status") ?? "");
  const [filterVehicleType, setFilterVehicleType] = useState<string>("");
  const [filterOwnerDept, setFilterOwnerDept] = useState<string>("");
  const [filterNearDue, setFilterNearDue] = useState<string>(() => initialParams.get("due") ?? "");
  const [filterIncomplete, setFilterIncomplete] = useState<string>("");
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [vinHint, setVinHint] = useState("");
  const [vinCountHint, setVinCountHint] = useState(`0/${VIN_LENGTH}`);
  const [engineNoHint, setEngineNoHint] = useState("");
  const [loadWeightHint, setLoadWeightHint] = useState("");
  const [dimensionsHint, setDimensionsHint] = useState("");
  const [ownerAddressTouched, setOwnerAddressTouched] = useState(false);
  const [filesRefreshing, setFilesRefreshing] = useState(false);
  const engineNoInputRef = useRef<HTMLInputElement | null>(null);
  const [form] = Form.useForm<VehicleForm>();
  const requiredLabel = (text: string) => (
    <span>
      {text}
      <span className="ml-0.5 text-red-500">*</span>
    </span>
  );
  const normalizeAttachmentKeys = (keys: Array<string | null | undefined>) =>
    keys
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .filter((k, idx, arr) => arr.indexOf(k) === idx)
      .slice(0, MAX_ATTACHMENT_KEYS);
  const parseDimensionsParts = (raw: string | undefined) => {
    const parts = String(raw ?? "").split("×");
    return {
      length: String(parts[0] ?? "").replace(/[^\d]/g, "").slice(0, 4),
      width: String(parts[1] ?? "").replace(/[^\d]/g, "").slice(0, 4),
      height: String(parts[2] ?? "").replace(/[^\d]/g, "").slice(0, 4),
    };
  };
  const composeDimensions = (length: string, width: string, height: string) => {
    if (!length && !width && !height) return "";
    return `${length}×${width}×${height}`;
  };
  const applyOwnerAddressByName = (name: string) => {
    const normalizedName = String(name ?? "").trim();
    if (!normalizedName) return;
    if (ownerAddressTouched) return;
    const addr = ownerDirectoryMap.get(normalizedName);
    if (addr !== undefined) {
      setRhfValue("ownerAddress", addr);
      form.setFieldValue("ownerAddress", addr);
    }
  };
  const deriveAttachmentKeys = (vehicle: Vehicle, cycle: VehicleCycle | null | undefined) => {
    const meta = parseRemarkMeta(vehicle.remark);
    const driving = normalizeAttachmentKeys([
      ...meta.drivingLicenseAttachmentKeys,
      meta.drivingLicenseAttachmentKey,
    ]);
    const insurance = normalizeAttachmentKeys([
      ...meta.insuranceAttachmentKeys,
      ...meta.insuranceCompulsoryAttachmentKeys,
      ...meta.insuranceCommercialAttachmentKeys,
      cycle?.insuranceAttachmentKey,
    ]);
    return { driving, insurance };
  };
  const reconcileViewAttachmentState = async (vehicleId: string) => {
    const latest = await load(q);
    const latestVehicle = latest.vehicles.find((x) => x.id === vehicleId);
    if (!latestVehicle) return;
    let latestCycle = latest.cyclesByVehicleId[vehicleId] ?? null;
    const cycleRes = await fetchVehicleCycle(vehicleId);
    if (cycleRes.ok) {
      latestCycle = cycleRes.data.cycle;
    }
    const next = deriveAttachmentKeys(latestVehicle, latestCycle);
    setViewVehicle(latestVehicle);
    setViewCycle(latestCycle);
    setViewInsuranceKeys(next.insurance);
    setViewDrivingLicenseKeys(next.driving);
    setRows((prev) => prev.map((x) => (x.id === vehicleId ? latestVehicle : x)));
    setCyclesByVehicleId((prev) => ({ ...prev, [vehicleId]: latestCycle }));
  };
  const syncInsuranceAttachmentFields = (nextCompulsory: string[], nextCommercial: string[]) => {
    const merged = normalizeAttachmentKeys([...nextCompulsory, ...nextCommercial]);
    form.setFieldValue("insuranceCompulsoryAttachmentKeys", nextCompulsory);
    form.setFieldValue("insuranceCommercialAttachmentKeys", nextCommercial);
    form.setFieldValue("insuranceAttachmentKeys", merged);
    form.setFieldValue("insuranceAttachmentKey", merged[0] || "");
  };
  const appendAttachmentKeys = (fieldName: "drivingLicenseAttachmentKeys" | "insuranceCompulsoryAttachmentKeys" | "insuranceCommercialAttachmentKeys", key: string) => {
    const prev = (form.getFieldValue(fieldName) as string[] | undefined) ?? [];
    return normalizeAttachmentKeys([...prev, key]);
  };
  const getAttachmentKeys = (fieldName: "drivingLicenseAttachmentKeys" | "insuranceAttachmentKeys" | "insuranceCompulsoryAttachmentKeys" | "insuranceCommercialAttachmentKeys") => {
    const raw = (form.getFieldValue(fieldName) as string[] | undefined) ?? [];
    return normalizeAttachmentKeys(raw);
  };
  useEffect(() => {
    viewVehicleRef.current = viewVehicle;
  }, [viewVehicle]);
  const closeEditModal = () => {
    setOpen(false);
    setDiscardConfirmOpen(false);
    setEditDirty(false);
    setEditTab("basic");
    setEditScrollTarget(null);
  };
  const requestCloseEditModal = () => {
    if (editDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeEditModal();
  };
  const {
    control,
    getValues: getRhfValues,
    reset: resetRhf,
    setValue: setRhfValue,
  } = useRhfForm<VehicleForm>({
    defaultValues: {
      plateNo: DEFAULT_PLATE_NO_PREFIX,
      vehicleType: "",
      energyType: "",
      usageNature: "",
      brandModel: "",
      vin: "",
      engineNo: "",
      regDate: "",
      issueDate: "",
      archiveNo: "",
      loadPeople: "",
      loadWeight: "",
      dimensions: "",
      ownerName: "",
      ownerAddress: "",
      ownerDept: "",
      ownerPerson: "",
      mileage: 0,
      maintNextKm: 0,
      status: "normal",
      drivingLicenseAttachmentKey: "",
      remark: "",
    },
  });

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
      drivingLicenseAttachmentKeys: pick("行驶证附件Keys:")
        .split("|")
        .map((x) => x.trim()),
      insuranceAttachmentKeys: pick("保单附件Keys:").split("|").map((x) => x.trim()),
      insuranceCompulsoryAttachmentKeys: pick("交强险附件Keys:").split("|").map((x) => x.trim()),
      insuranceCommercialAttachmentKeys: pick("商业险附件Keys:").split("|").map((x) => x.trim()),
    };
    meta.drivingLicenseAttachmentKeys = normalizeAttachmentKeys(meta.drivingLicenseAttachmentKeys);
    meta.insuranceAttachmentKeys = normalizeAttachmentKeys(meta.insuranceAttachmentKeys);
    meta.insuranceCompulsoryAttachmentKeys = normalizeAttachmentKeys(meta.insuranceCompulsoryAttachmentKeys);
    meta.insuranceCommercialAttachmentKeys = normalizeAttachmentKeys(meta.insuranceCommercialAttachmentKeys);
    if (meta.insuranceCompulsoryAttachmentKeys.length === 0 && meta.insuranceCommercialAttachmentKeys.length === 0 && meta.insuranceAttachmentKeys.length > 0) {
      // Backward compatibility: old single insurance keys are treated as compulsory keys by default.
      meta.insuranceCompulsoryAttachmentKeys = [...meta.insuranceAttachmentKeys];
    }
    const body = lines
      .filter(
        (l) =>
          !l.startsWith("档案编号:") &&
          !l.startsWith("所有人:") &&
          !l.startsWith("发证日期:") &&
          !l.startsWith("住址:") &&
          !l.startsWith("行驶证附件Key:") &&
          !l.startsWith("行驶证附件Keys:") &&
          !l.startsWith("保单附件Keys:") &&
          !l.startsWith("交强险附件Keys:") &&
          !l.startsWith("商业险附件Keys:"),
      )
      .join("\n");
    return { ...meta, remarkBody: body };
  };

  const renderTextInput = (key: string, placeholder?: string) => {
    const options = normalizeDropdownOptions(dropdowns[key], []);
    if (options.length === 0) return <Input placeholder={placeholder} />;
    return <Select allowClear showSearch options={options.map((v) => ({ label: v, value: v }))} placeholder={placeholder} />;
  };

  const statusOptions = [
    { label: "正常", value: "normal" },
    { label: "维修中", value: "repairing" },
    { label: "停用", value: "stopped" },
    { label: "报废", value: "scrapped" },
  ] as const;
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

  const vehicleStatusTone = (status: Vehicle["status"]): "success" | "warning" | "danger" | "neutral" => {
    if (status === "normal") return "success";
    if (status === "repairing") return "warning";
    if (status === "scrapped") return "danger";
    return "neutral";
  };

  const getVehicleCompleteness = (vehicle: Vehicle, cycle: VehicleCycle | null | undefined) => {
    const meta = parseRemarkMeta(vehicle.remark);
    const split = (text: string | null | undefined) =>
      (text ?? "")
        .split("/")
        .map((x) => x.trim())
        .filter(Boolean);
    const [energyType, usageNature] = split(vehicle.usageNature);
    const [loadPeople, loadWeight, dimensions] = split(vehicle.loadSpec);
    const requiredChecks = [
      !!vehicle.plateNo,
      !!vehicle.vehicleType,
      !!vehicle.brandModel,
      !!vehicle.vin,
      !!vehicle.engineNo,
      !!vehicle.regDate,
      !!energyType,
      !!usageNature,
      !!loadPeople,
      !!loadWeight,
      !!dimensions,
      !!vehicle.ownerDept,
      !!vehicle.ownerPerson,
      Number.isFinite(Number(vehicle.mileage)),
      !!meta.issueDate,
      !!meta.archiveNo,
      !!meta.ownerName,
      !!meta.ownerAddress,
      !!cycle?.insuranceType,
      !!cycle?.insuranceVendor,
      !!cycle?.insuranceStart,
      !!cycle?.insuranceExpiry,
      !!cycle?.annualLastDate,
      !!cycle?.annualExpiry,
      !!cycle?.maintLastDate,
      typeof cycle?.maintIntervalDays === "number",
      typeof cycle?.maintIntervalKm === "number",
      !!cycle?.maintNextDate,
      typeof cycle?.maintNextKm === "number",
    ];
    const filled = requiredChecks.filter(Boolean).length;
    const total = requiredChecks.length;
    const percent = Math.round((filled / total) * 100);
    return { filled, total, percent };
  };

  const getDueHint = (cycle: VehicleCycle | null | undefined) => {
    if (!cycle) return { text: "-", color: "default" as const, level: "none" as const };
    const today = dayjs().startOf("day");
    const insurance = parseInsuranceBundle(cycle);
    const candidates = [
      { label: "交强险", date: insurance.compulsory.expiry || null },
      { label: "商业险", date: insurance.commercial.expiry || null },
      { label: "年审", date: cycle.annualExpiry },
      { label: "保养", date: cycle.maintNextDate },
    ]
      .map((x) => ({ ...x, parsed: x.date ? dayjs(x.date).startOf("day") : null }))
      .filter((x) => x.parsed && x.parsed.isValid()) as Array<{ label: string; date: string | null; parsed: Dayjs }>;
    if (candidates.length === 0) return { text: "-", color: "default" as const, level: "none" as const };
    candidates.sort((a, b) => a.parsed.diff(b.parsed, "day"));
    const nearest = candidates[0];
    const diffDays = nearest.parsed.diff(today, "day");
    if (diffDays < 0) return { text: `${nearest.label}已逾期${Math.abs(diffDays)}天`, color: "red" as const, level: "overdue" as const };
    if (diffDays <= 7) return { text: `${nearest.label}${diffDays}天后到期`, color: "orange" as const, level: "within7" as const };
    if (diffDays <= 30) return { text: `${nearest.label}${diffDays}天后到期`, color: "gold" as const, level: "within30" as const };
    return { text: `${nearest.label}正常`, color: "green" as const, level: "normal" as const };
  };
  const getDateRiskLevel = (dateText: unknown): "ok" | "soon" | "overdue" | "none" => {
    const text =
      typeof (dateText as { format?: (p: string) => string })?.format === "function"
        ? (dateText as { format: (p: string) => string }).format("YYYY-MM-DD")
        : String(dateText ?? "").trim();
    if (!text) return "none";
    const d = dayjs(text, "YYYY-MM-DD", true);
    if (!d.isValid()) return "none";
    const diff = d.startOf("day").diff(dayjs().startOf("day"), "day");
    if (diff < 0) return "overdue";
    if (diff <= 30) return "soon";
    return "ok";
  };
  const getEditTabStatus = (tabKey: "basic" | "insurance" | "annual" | "maint") => {
    if (tabKey === "insurance") {
      const exp1 = getDateRiskLevel(form.getFieldValue("insuranceCompulsoryExpiry"));
      const exp2 = getDateRiskLevel(form.getFieldValue("insuranceCommercialExpiry"));
      if (exp1 === "overdue" || exp2 === "overdue") return "overdue" as const;
      if (exp1 === "soon" || exp2 === "soon") return "soon" as const;
      if (exp1 === "ok" || exp2 === "ok") return "ok" as const;
      return "none" as const;
    }
    if (tabKey === "annual") return getDateRiskLevel(form.getFieldValue("annualExpiry"));
    if (tabKey === "maint") return getDateRiskLevel(form.getFieldValue("maintNextDate"));
    return "none" as const;
  };
  const tabDotClass = (status: "ok" | "soon" | "overdue" | "none") => {
    if (status === "overdue") return "bg-red-500";
    if (status === "soon") return "bg-amber-500";
    if (status === "ok") return "bg-emerald-500";
    return "bg-slate-300";
  };
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterVehicleType && r.vehicleType !== filterVehicleType) return false;
      if (filterOwnerDept && r.ownerDept !== filterOwnerDept) return false;
      if (filterNearDue) {
        const dueLevel = getDueHint(cyclesByVehicleId[r.id]).level;
        if (filterNearDue === "due" && !(dueLevel === "within7" || dueLevel === "within30" || dueLevel === "overdue")) return false;
        if (filterNearDue === "overdue" && dueLevel !== "overdue") return false;
        if (filterNearDue === "within7" && dueLevel !== "within7") return false;
        if (filterNearDue === "within30" && dueLevel !== "within30") return false;
      }
      if (filterIncomplete) {
        const completeness = getVehicleCompleteness(r, cyclesByVehicleId[r.id]);
        if (filterIncomplete === "yes" && completeness.percent >= 100) return false;
      }
      return true;
    });
  }, [rows, filterStatus, filterVehicleType, filterOwnerDept, filterNearDue, filterIncomplete, cyclesByVehicleId]);
  const vehicleTypeFilterOptions = Array.from(new Set(rows.map((r) => r.vehicleType))).map((v) => ({ label: v, value: v }));
  const ownerDeptFilterOptions = Array.from(new Set(rows.map((r) => r.ownerDept))).map((v) => ({ label: v, value: v }));
  /** 系统配置中的部门字典 + 台账已有部门，供表单下拉；仍允许 AutoComplete 手输新部门 */
  const ownerDeptSelectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of normalizeDropdownOptions(dropdowns.ownerDept, [])) {
      set.add(v);
    }
    for (const r of rows) {
      const v = r.ownerDept?.trim();
      if (v) set.add(v);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .map((v) => ({ label: v, value: v }));
  }, [dropdowns.ownerDept, rows]);

  const ownerDirectoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of ownerDirectory) {
      const name = String(o.name ?? "").trim();
      const address = String(o.address ?? "").trim();
      if (name && address) map.set(name, address);
    }
    return map;
  }, [ownerDirectory]);
  const ownerNameSelectOptions = useMemo(
    () => Array.from(ownerDirectoryMap.keys()).map((name) => ({ label: name, value: name })),
    [ownerDirectoryMap],
  );

  useEffect(() => {
    void load(q);
    void loadDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时按初始 q 拉取；搜索由 onSearch 调用 load
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1" || !canManage) return;
    setEditing(null);
    form.resetFields();
    resetRhf({
      plateNo: DEFAULT_PLATE_NO_PREFIX,
      vehicleType: "",
      brandModel: "",
      vin: "",
      engineNo: "",
      ownerDept: "",
      ownerPerson: "",
      mileage: 0,
      status: "normal",
    });
    setEditDirty(false);
    setOpen(true);
    params.delete("create");
    const next = params.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [canManage, form]);

  const submit = async (opts?: { continueCreate?: boolean }) => {
    try {
      const v = await form.validateFields();
      const rhfValues = getRhfValues();
      const validated = vehicleSubmitSchema.safeParse({
        plateNo: rhfValues.plateNo,
        vehicleType: rhfValues.vehicleType,
        brandModel: rhfValues.brandModel,
        vin: rhfValues.vin,
        engineNo: rhfValues.engineNo,
        ownerDept: rhfValues.ownerDept,
        ownerPerson: rhfValues.ownerPerson,
        mileage: Number(rhfValues.mileage),
      });
      if (!validated.success) {
        message.error(validated.error.issues[0]?.message ?? "表单校验失败");
        return;
      }
      const regDate = toYmd(rhfValues.regDate ?? v.regDate);
      const issueDate = toYmd(rhfValues.issueDate ?? v.issueDate);
      const normalizedPlateNo = normalizePlateNo(rhfValues.plateNo);
      const vin = String(rhfValues.vin ?? "").trim().toUpperCase();
      const engineNo = String(rhfValues.engineNo ?? "").trim().toUpperCase();
      const currentMileage = Number(rhfValues.mileage ?? v.mileage ?? 0);
      const nextMaintKm = Number(rhfValues.maintNextKm ?? v.maintNextKm ?? 0);
      const coreValidationError = validateVehicleCoreInputs({
        plateNo: normalizedPlateNo,
        vin,
        engineNo,
        currentMileage,
        nextMaintKm,
      });
      if (coreValidationError) return message.error(coreValidationError);
      const insuranceAttachmentKey = String(form.getFieldValue("insuranceAttachmentKey") ?? v.insuranceAttachmentKey ?? "").trim();
      const drivingLicenseAttachmentKey = String(rhfValues.drivingLicenseAttachmentKey ?? v.drivingLicenseAttachmentKey ?? "").trim();
      const insuranceAttachmentKeys = getAttachmentKeys("insuranceAttachmentKeys");
      const insuranceCompulsoryAttachmentKeys = getAttachmentKeys("insuranceCompulsoryAttachmentKeys");
      const insuranceCommercialAttachmentKeys = getAttachmentKeys("insuranceCommercialAttachmentKeys");
      const insuranceAllAttachmentKeys = normalizeAttachmentKeys([
        ...insuranceAttachmentKeys,
        ...insuranceCompulsoryAttachmentKeys,
        ...insuranceCommercialAttachmentKeys,
      ]);
      const drivingLicenseAttachmentKeys = getAttachmentKeys("drivingLicenseAttachmentKeys");
      const mergedUsageNature = [rhfValues.energyType, rhfValues.usageNature].filter(Boolean).join(" / ");
      const mergedLoadSpec = [rhfValues.loadPeople, rhfValues.loadWeight, rhfValues.dimensions].filter(Boolean).join(" / ");
      const maintIntervalDays = normalizePositiveInteger(v.maintIntervalDays);
      const maintIntervalKm = normalizePositiveInteger(v.maintIntervalKm);
      const insuranceDraft = {
        insuranceCompulsoryVendor: String(form.getFieldValue("insuranceCompulsoryVendor") ?? "").trim(),
        insuranceCompulsoryStart: toYmd(form.getFieldValue("insuranceCompulsoryStart")),
        insuranceCompulsoryExpiry: toYmd(form.getFieldValue("insuranceCompulsoryExpiry")),
        insuranceCommercialVendor: String(form.getFieldValue("insuranceCommercialVendor") ?? "").trim(),
        insuranceCommercialStart: toYmd(form.getFieldValue("insuranceCommercialStart")),
        insuranceCommercialExpiry: toYmd(form.getFieldValue("insuranceCommercialExpiry")),
      };
      const insuranceMerged = buildInsurancePayload(insuranceDraft);
      const annualLastDate = toYmd(v.annualLastDate);
      const annualExpiry = toYmd(v.annualExpiry);
      const maintLastDate = toYmd(v.maintLastDate);
      const maintNextDate = toYmd(v.maintNextDate);
      const insuranceValidationError = validateInsuranceDraft({
        hasCompulsory: insuranceMerged.hasCompulsory,
        hasCommercial: insuranceMerged.hasCommercial,
        compulsoryVendor: insuranceDraft.insuranceCompulsoryVendor,
        compulsoryStart: insuranceDraft.insuranceCompulsoryStart,
        compulsoryExpiry: insuranceDraft.insuranceCompulsoryExpiry,
        commercialVendor: insuranceDraft.insuranceCommercialVendor,
        commercialStart: insuranceDraft.insuranceCommercialStart,
        commercialExpiry: insuranceDraft.insuranceCommercialExpiry,
      });
      if (insuranceValidationError) return message.error(insuranceValidationError);
      const cycleValidationError = validateCycleInputs({
        annualLastDate,
        annualExpiry,
        maintLastDate,
        maintNextDate,
        maintIntervalDays,
        maintIntervalKm,
      });
      if (cycleValidationError) return message.error(cycleValidationError);
      const mergedRemark = buildMergedRemark({
        remark: rhfValues.remark,
        archiveNo: rhfValues.archiveNo,
        ownerName: rhfValues.ownerName,
        issueDate,
        ownerAddress: rhfValues.ownerAddress,
        drivingLicenseAttachmentKey,
        drivingLicenseAttachmentKeys,
        insuranceAllAttachmentKeys,
        insuranceCompulsoryAttachmentKeys,
        insuranceCommercialAttachmentKeys,
      });
      const payload = buildVehicleSubmitPayload({
        formValues: rhfValues as unknown as Record<string, unknown>,
        validatedValues: v as unknown as Record<string, unknown>,
        normalizedPlateNo,
        regDate,
        mergedLoadSpec,
        mergedUsageNature,
        mergedRemark,
      });
      const res = await requestUpsertVehicle(editing?.id ?? null, payload);
      if (!res.ok) return message.error(res.error.message);
      const vehicleId = editing ? editing.id : res.data.id;
      if (vehicleId) {
        const cycleRes = await requestPutVehicleCycles(
          vehicleId,
          buildCycleSubmitPayload({
            insuranceType: insuranceMerged.insuranceType,
            insuranceVendor: insuranceMerged.insuranceVendor,
            insuranceStart: insuranceMerged.insuranceStart,
            insuranceExpiry: insuranceMerged.insuranceExpiry,
            insuranceAttachmentKey: insuranceAttachmentKey || insuranceAllAttachmentKeys[0] || "",
            annualLastDate,
            annualExpiry,
            maintLastDate,
            maintIntervalDays,
            maintIntervalKm,
            maintNextDate,
            maintNextKm: v.maintNextKm,
          }),
        );
        if (!cycleRes.ok) {
          message.error(cycleRes.error.message || "周期信息保存失败，请重试");
          return;
        }
      }
      const resetForNext = () => {
        form.resetFields();
        resetRhf({
          plateNo: DEFAULT_PLATE_NO_PREFIX,
          vehicleType: "",
          energyType: "",
          usageNature: "",
          brandModel: "",
          vin: "",
          engineNo: "",
          regDate: "",
          issueDate: "",
          archiveNo: "",
          loadPeople: "",
          loadWeight: "",
          dimensions: "",
          ownerName: "",
          ownerAddress: "",
          ownerDept: "",
          ownerPerson: "",
          mileage: 0,
          maintNextKm: 0,
          status: "normal",
          drivingLicenseAttachmentKey: "",
          remark: "",
        });
      };
      if (opts?.continueCreate) {
        setEditing(null);
        setEditTab("basic");
        setEditDirty(false);
        resetForNext();
        message.success("已保存，可继续新增下一条");
        await load(q);
        return;
      }
      message.success(editing ? `保存成功：${normalizedPlateNo}` : `新增成功：${normalizedPlateNo}`);
      setEditDirty(false);
      closeEditModal();
      resetForNext();
      setEditing(null);
      await load(q);
    } catch (err: unknown) {
      const validationErr = err as FormValidationError;
      const msg = String(validationErr?.message ?? (err instanceof Error ? err.message : "") ?? "表单校验失败");
      message.error(msg || "表单校验失败");
      const firstName = validationErr?.errorFields?.[0]?.name;
      if (firstName) {
        const key = Array.isArray(firstName) ? firstName.join(".") : String(firstName);
        const tab = tabByFieldKey(key);
        setEditTab(tab);
        window.setTimeout(() => {
          const el = document.querySelector(`[data-form-item-name="${key}"]`) as HTMLElement | null;
          el?.scrollIntoView({ block: "center", behavior: "smooth" });
          const focusTarget = el?.querySelector(FORM_FOCUSABLE_SELECTOR) as HTMLElement | null;
          // Prevent extra scroll jumps: element already in view after scrollIntoView.
          if (focusTarget && typeof focusTarget.focus === "function") {
            focusTarget.focus({ preventScroll: true });
          }
        }, VEHICLE_MODAL_SCROLL_WAIT_MS);
      }
    }
  };

  const resetCreateForm = () => {
    setEditing(null);
    setEditDirty(false);
    setVinHint("");
    setEngineNoHint("");
    setLoadWeightHint("");
    setDimensionsHint("");
    setVinCountHint(`0/${VIN_LENGTH}`);
    setOwnerAddressTouched(false);
    form.resetFields();
    resetRhf({
        plateNo: DEFAULT_PLATE_NO_PREFIX,
        vehicleType: "",
        energyType: "",
        usageNature: "",
        brandModel: "",
        vin: "",
        engineNo: "",
        regDate: "",
        issueDate: "",
        archiveNo: "",
        loadPeople: "",
        loadWeight: "",
        dimensions: "",
        ownerName: "",
        ownerAddress: "",
        ownerDept: "",
        ownerPerson: "",
        mileage: 0,
        maintNextKm: 0,
        status: "normal",
        drivingLicenseAttachmentKey: "",
        remark: "",
      });
    setEditTab("basic");
    setOpen(true);
  };

  const setStatus = async (id: string, status: Vehicle["status"]) => {
    const reason = await requestOperationReason("请输入变更车辆状态的理由");
    if (!reason) return;
    const res = await requestPutVehicleStatus(id, status, reason);
    if (!res.ok) return message.error(res.error.message);
    message.success("状态已更新");
    await load(q);
  };

  const openEdit = (
    r: Vehicle,
    tab: "basic" | "insurance" | "annual" | "maint" = "basic",
    scrollTo: "insuranceUpload" | "drivingLicenseUpload" | null = null,
  ) => {
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
    const cachedCycle = cyclesByVehicleId[r.id];
    const insuranceBundle = parseInsuranceBundle(cachedCycle);
    const annualIntervalMonths =
      cachedCycle?.annualLastDate && cachedCycle?.annualExpiry
        ? Math.max(1, dayjs(cachedCycle.annualExpiry).diff(dayjs(cachedCycle.annualLastDate), "month"))
        : DEFAULT_ANNUAL_INTERVAL_MONTHS;

    setEditing(r);
    setEditTab(tab);
    setEditScrollTarget(scrollTo);
    setEditDirty(false);
    setVinHint("");
    setEngineNoHint("");
    setLoadWeightHint("");
    setDimensionsHint("");
    setVinCountHint(`${(r.vin ?? "").length}/${VIN_LENGTH}`);
    setOwnerAddressTouched(false);
    setOpen(true);
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
      drivingLicenseAttachmentKeys:
        meta.drivingLicenseAttachmentKeys.length > 0
          ? meta.drivingLicenseAttachmentKeys
          : meta.drivingLicenseAttachmentKey
            ? [meta.drivingLicenseAttachmentKey]
            : [],
      remark: meta.remarkBody || "",
      insuranceType: cachedCycle?.insuranceType || "",
      insuranceVendor: cachedCycle?.insuranceVendor || "",
      insuranceStart: cachedCycle?.insuranceStart || "",
      insuranceExpiry: cachedCycle?.insuranceExpiry || "",
      insuranceCompulsoryVendor: insuranceBundle.compulsory.vendor,
      insuranceCompulsoryStart: insuranceBundle.compulsory.start,
      insuranceCompulsoryExpiry: insuranceBundle.compulsory.expiry,
      insuranceCommercialVendor: insuranceBundle.commercial.vendor,
      insuranceCommercialStart: insuranceBundle.commercial.start,
      insuranceCommercialExpiry: insuranceBundle.commercial.expiry,
      insuranceAttachmentKey: cachedCycle?.insuranceAttachmentKey || "",
      insuranceAttachmentKeys:
        meta.insuranceAttachmentKeys.length > 0 || meta.insuranceCompulsoryAttachmentKeys.length > 0 || meta.insuranceCommercialAttachmentKeys.length > 0
          ? normalizeAttachmentKeys([
              ...meta.insuranceAttachmentKeys,
              ...meta.insuranceCompulsoryAttachmentKeys,
              ...meta.insuranceCommercialAttachmentKeys,
            ])
          : cachedCycle?.insuranceAttachmentKey
            ? [cachedCycle.insuranceAttachmentKey]
            : [],
      insuranceCompulsoryAttachmentKeys: meta.insuranceCompulsoryAttachmentKeys,
      insuranceCommercialAttachmentKeys: meta.insuranceCommercialAttachmentKeys,
      annualLastDate: cachedCycle?.annualLastDate || "",
      annualExpiry: cachedCycle?.annualExpiry || "",
      annualIntervalMonths,
      maintLastDate: cachedCycle?.maintLastDate || "",
      maintIntervalDays: cachedCycle?.maintIntervalDays ?? undefined,
      maintIntervalKm: cachedCycle?.maintIntervalKm ?? undefined,
      maintNextDate: cachedCycle?.maintNextDate || "",
      maintNextKm: cachedCycle?.maintNextKm ?? undefined,
    });
    // Use one-shot reset to avoid partial/empty values when reopening edit modal.
    resetRhf({
      plateNo: r.plateNo,
      vehicleType: r.vehicleType,
      energyType: energyType || "",
      usageNature: usageNature || "",
      brandModel: r.brandModel,
      vin: r.vin,
      engineNo: r.engineNo,
      regDate: r.regDate || "",
      issueDate: meta.issueDate || "",
      archiveNo: meta.archiveNo || "",
      loadPeople: loadPeople || "",
      loadWeight: loadWeight || "",
      dimensions: dimensions || "",
      ownerName: meta.ownerName || "",
      ownerAddress: meta.ownerAddress || "",
      ownerDept: r.ownerDept,
      ownerPerson: r.ownerPerson,
      mileage: Number(r.mileage ?? 0),
      maintNextKm: Number(cachedCycle?.maintNextKm ?? 0),
      status: r.status,
      drivingLicenseAttachmentKey: meta.drivingLicenseAttachmentKey || "",
      drivingLicenseAttachmentKeys:
        meta.drivingLicenseAttachmentKeys.length > 0
          ? meta.drivingLicenseAttachmentKeys
          : meta.drivingLicenseAttachmentKey
            ? [meta.drivingLicenseAttachmentKey]
            : [],
      remark: meta.remarkBody || "",
    });

    void fetchVehicleCycle(r.id).then((cycleRes) => {
      if (!cycleRes.ok || !cycleRes.data.cycle) return;
      const c = cycleRes.data.cycle;
      const nextInsuranceBundle = parseInsuranceBundle(c);
      // Modal/form is already open; apply latest cycle fields once fetched.
      form.setFieldsValue({
        insuranceType: c.insuranceType || "",
        insuranceVendor: c.insuranceVendor || "",
        insuranceStart: c.insuranceStart || "",
        insuranceExpiry: c.insuranceExpiry || "",
        insuranceCompulsoryVendor: nextInsuranceBundle.compulsory.vendor,
        insuranceCompulsoryStart: nextInsuranceBundle.compulsory.start,
        insuranceCompulsoryExpiry: nextInsuranceBundle.compulsory.expiry,
        insuranceCommercialVendor: nextInsuranceBundle.commercial.vendor,
        insuranceCommercialStart: nextInsuranceBundle.commercial.start,
        insuranceCommercialExpiry: nextInsuranceBundle.commercial.expiry,
        insuranceAttachmentKey: c.insuranceAttachmentKey || "",
        insuranceCompulsoryAttachmentKeys: meta.insuranceCompulsoryAttachmentKeys,
        insuranceCommercialAttachmentKeys: meta.insuranceCommercialAttachmentKeys,
        annualLastDate: c.annualLastDate || "",
        annualExpiry: c.annualExpiry || "",
        annualIntervalMonths:
          c.annualLastDate && c.annualExpiry
            ? Math.max(1, dayjs(c.annualExpiry).diff(dayjs(c.annualLastDate), "month"))
            : DEFAULT_ANNUAL_INTERVAL_MONTHS,
        maintLastDate: c.maintLastDate || "",
        maintIntervalDays: c.maintIntervalDays ?? undefined,
        maintIntervalKm: c.maintIntervalKm ?? undefined,
        maintNextDate: c.maintNextDate || "",
        maintNextKm: c.maintNextKm ?? undefined,
      });
      setRhfValue("maintNextKm", Number(c.maintNextKm ?? 0));
    });
  };

  useEffect(() => {
    if (!open || !editScrollTarget) return;
    const run = () => {
      const wrap = editScrollWrapRef.current;
      const target =
        editScrollTarget === "insuranceUpload" ? insuranceUploadRef.current : drivingLicenseUploadRef.current;
      if (!wrap || !target) return;
      // Ensure the tab panel is rendered before scrolling.
      target.scrollIntoView({ block: "start", behavior: "smooth" });
      setEditScrollTarget(null);
    };
    const t = window.setTimeout(run, VEHICLE_MODAL_SCROLL_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [open, editScrollTarget, editTab]);

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

  useEffect(() => {
    const url = new URL(window.location.href);
    if (filterStatus) url.searchParams.set("status", filterStatus);
    else url.searchParams.delete("status");
    if (filterNearDue) url.searchParams.set("due", filterNearDue);
    else url.searchParams.delete("due");
    window.history.replaceState(null, "", url.toString());
  }, [filterStatus, filterNearDue]);

  const openView = async (r: Vehicle, tab: "base" | "cycle" | "files" = "base") => {
    const latestRow = rows.find((x) => x.id === r.id) ?? r;
    const cachedCycle = cyclesByVehicleId[latestRow.id];
    const raw = deriveAttachmentKeys(latestRow, cachedCycle);
    const rawDrivingLicenseKeysFromMeta = raw.driving;
    const rawInsuranceKeysFromMeta = raw.insurance;

    setViewVehicle(latestRow);
    setViewCycle(null);
    // Show locally known keys immediately to avoid transient "未上传" flicker.
    setViewInsuranceKeys(rawInsuranceKeysFromMeta);
    setViewDrivingLicenseKeys(rawDrivingLicenseKeysFromMeta);
    setViewTab(tab);
    setViewOpen(true);
    setViewLoading(true);
    try {
      const cycleRes = await fetchVehicleCycle(latestRow.id);
      if (!cycleRes.ok) return;

      setViewCycle(cycleRes.data.cycle);
      const merged = deriveAttachmentKeys(latestRow, cycleRes.data.cycle);
      const rawInsuranceKeys = merged.insurance;
      const rawDrivingLicenseKeys = merged.driving;

      // Keep counts consistent with saved record data in edit form.
      setViewInsuranceKeys(rawInsuranceKeys);
      setViewDrivingLicenseKeys(rawDrivingLicenseKeys);
    } finally {
      setViewLoading(false);
    }
  };
  const refreshViewFilesState = async () => {
    if (!viewVehicle) return;
    setFilesRefreshing(true);
    try {
      await reconcileViewAttachmentState(viewVehicle.id);
      message.success("附件状态已刷新");
    } finally {
      setFilesRefreshing(false);
    }
  };

  const viewAttachment = (
    attachmentKeys: string[] | string,
    source: "insuranceCompulsory" | "insuranceCommercial" | "driving" | "other" = "other",
  ) => {
    const keys = Array.isArray(attachmentKeys) ? attachmentKeys : [attachmentKeys];
    const paths = keys.filter(Boolean).map((k) => `/files/${encodeURIComponent(k)}`);
    setViewerPaths(paths);
    setViewerInitialIndex(0);
    setViewerSource(source);
    setViewerPath(paths[0] || null);
  };

  const persistViewerAttachmentChanges = async (
    source: "insuranceCompulsory" | "insuranceCommercial" | "driving" | "other",
    nextKeys: string[],
  ): Promise<boolean> => {
    const currentVehicle = viewVehicleRef.current;
    if (!currentVehicle || source === "other") return true;
    const normalizedNextKeys = normalizeAttachmentKeys(nextKeys);
    const parsed = parseRemarkMeta(currentVehicle.remark);
    const { nextAllInsuranceKeys, nextMeta } = computeNextAttachmentMeta(parsed, source, normalizedNextKeys, normalizeAttachmentKeys);

    if (source === "insuranceCompulsory" || source === "insuranceCommercial") {
      let cycleSnapshot = viewCycle;
      if (!cycleSnapshot) {
        const fresh = await fetchVehicleCycle(currentVehicle.id);
        if (!fresh.ok) {
          message.error(fresh.error.message || "附件更新失败");
          return false;
        }
        cycleSnapshot = fresh.data.cycle;
      }
      if (!cycleSnapshot) {
        message.error("附件更新失败");
        return false;
      }
      const cycleRes = await requestPutVehicleCycles(currentVehicle.id, {
        insuranceType: cycleSnapshot.insuranceType || null,
        insuranceVendor: cycleSnapshot.insuranceVendor || null,
        insuranceStart: cycleSnapshot.insuranceStart || null,
        insuranceExpiry: cycleSnapshot.insuranceExpiry || null,
        insuranceAttachmentKey: nextAllInsuranceKeys[0] || null,
        annualLastDate: cycleSnapshot.annualLastDate || null,
        annualExpiry: cycleSnapshot.annualExpiry || null,
        maintLastDate: cycleSnapshot.maintLastDate || null,
        maintIntervalDays: cycleSnapshot.maintIntervalDays ?? null,
        maintIntervalKm: cycleSnapshot.maintIntervalKm ?? null,
        maintNextDate: cycleSnapshot.maintNextDate || null,
        maintNextKm: cycleSnapshot.maintNextKm ?? null,
      });
      if (!cycleRes.ok) {
        message.error(cycleRes.error.message || "附件更新失败");
        return false;
      }
    }

    const nextRemark = buildMergedRemark({
      remark: nextMeta.remarkBody,
      archiveNo: nextMeta.archiveNo,
      ownerName: nextMeta.ownerName,
      issueDate: nextMeta.issueDate,
      ownerAddress: nextMeta.ownerAddress,
      drivingLicenseAttachmentKey: nextMeta.drivingLicenseAttachmentKey,
      drivingLicenseAttachmentKeys: nextMeta.drivingLicenseAttachmentKeys,
      insuranceAllAttachmentKeys: nextMeta.insuranceAttachmentKeys,
      insuranceCompulsoryAttachmentKeys: nextMeta.insuranceCompulsoryAttachmentKeys,
      insuranceCommercialAttachmentKeys: nextMeta.insuranceCommercialAttachmentKeys,
    }) || null;
    const res = await requestUpsertVehicle(currentVehicle.id, buildVehicleRemarkUpsertPayload(currentVehicle, nextRemark));
    if (!res.ok) {
      message.error(res.error.message || "附件更新失败");
      return false;
    }
    setViewVehicle((prev) => (prev ? { ...prev, remark: nextRemark } : prev));
    setRows((prev) => prev.map((x) => (x.id === currentVehicle.id ? { ...x, remark: nextRemark } : x)));
    if (source === "insuranceCompulsory" || source === "insuranceCommercial") {
      setCyclesByVehicleId((prev) => ({
        ...prev,
        [currentVehicle.id]: prev[currentVehicle.id]
          ? { ...prev[currentVehicle.id]!, insuranceAttachmentKey: nextAllInsuranceKeys[0] || null }
          : prev[currentVehicle.id],
      }));
    }
    // Read back from server immediately so count/status stays exact without manual refresh.
    await reconcileViewAttachmentState(currentVehicle.id);
    return true;
  };

  return (
    <PageContainer
      title="车辆台账"
      breadcrumb={[
        { title: "首页", path: "/" },
        { title: "车辆台账" },
      ]}
      extra={
        canManage ? (
          <Button
            type="primary"
            className={actionBtn.primary}
            onClick={() => {
              setEditing(null);
              resetCreateForm();
            }}
          >
            新增车辆
          </Button>
        ) : undefined
      }
    >
      <div className="ve-vehicles-page space-y-4">
        <div className="ve-vehicles-header w-full flex items-center">
          <Space size={[8, 8]} className="ve-vehicles-filters w-full">
          <Input.Search
            className="ve-vehicles-filter ve-vehicles-filter-search"
            placeholder="搜索车牌/品牌/归属"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onSearch={(v) => {
              const nextQ = v.trim();
              setQ(nextQ);
              updateQueryInUrl(nextQ);
              void load(nextQ);
            }}
            allowClear
          />
          <Select
            className="ve-vehicles-filter"
            allowClear
            placeholder="状态"
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
            className="ve-vehicles-filter"
            allowClear
            placeholder="车辆类型"
            value={filterVehicleType || undefined}
            onChange={(v) => setFilterVehicleType(v ?? "")}
            options={vehicleTypeFilterOptions}
          />
          <Select
            className="ve-vehicles-filter"
            allowClear
            placeholder="使用部门"
            value={filterOwnerDept || undefined}
            onChange={(v) => setFilterOwnerDept(v ?? "")}
            options={ownerDeptFilterOptions}
          />
          <Select
            className="ve-vehicles-filter"
            allowClear
            placeholder="到期分级"
            value={filterNearDue || undefined}
            onChange={(v) => setFilterNearDue(v ?? "")}
            options={[
              { label: "已逾期", value: "overdue" },
              { label: "7天内", value: "within7" },
              { label: "30天内", value: "within30" },
              { label: "全部临期", value: "due" },
            ]}
          />
          <Select
            className="ve-vehicles-filter"
            allowClear
            placeholder="台账缺项"
            value={filterIncomplete || undefined}
            onChange={(v) => setFilterIncomplete(v ?? "")}
            options={[{ label: "仅看不完整", value: "yes" }]}
          />
          <Button
            className={actionBtn.neutral}
            onClick={() => {
              setQ("");
              setFilterStatus("");
              setFilterVehicleType("");
              setFilterOwnerDept("");
              setFilterNearDue("");
              setFilterIncomplete("");
              updateQueryInUrl("");
              void load("");
            }}
          >
            重置筛选
          </Button>
        </Space>
      </div>

      {listLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
      <Table
        className="ve-vehicles-table"
        size="small"
        tableLayout="auto"
        rowKey="id"
        dataSource={filteredRows}
        pagination={false}
        scroll={{ x: 'max-content' }}
        sticky={{
          header: {
            offsetHeader: 48
          }
        }}
        rowClassName={(record, index) => index % 2 === 1 ? 'bg-slate-50/50' : ''}
        columns={[
          { title: "号牌号码", dataIndex: "plateNo", className: "py-2 px-3" },
          { title: "车辆类型", dataIndex: "vehicleType", className: "py-2 px-3" },
          {
            title: "能源类型",
            className: "py-2 px-3",
            render: (_, r) => {
              const text = (r.usageNature ?? "").trim();
              if (!text) return "-";
              const [energy] = text.split("/");
              return energy.trim() || "-";
            },
          },
          { title: "使用部门", dataIndex: "ownerDept", className: "py-2 px-3" },
          { title: "责任人", dataIndex: "ownerPerson", className: "py-2 px-3" },
          {
            title: "车辆状态",
            className: "py-2 px-3",
            render: (_, r) => {
              const m = statusMeta[r.status];
              return <StatusPill tone={vehicleStatusTone(r.status)} label={m.label} />;
            },
          },
          {
            title: "台账完整度",
            className: "py-2 px-3",
            render: (_, r) => {
              const c = getVehicleCompleteness(r, cyclesByVehicleId[r.id]);
              const tone = c.percent === 100 ? "success" : c.percent >= 80 ? "warning" : "danger";
              return <StatusPill tone={tone} label={`${c.percent}% (${c.filled}/${c.total})`} />;
            },
          },
          { title: "本次保养里程", dataIndex: "mileage", className: "py-2 px-3" },
          {
            title: "下次保养里程",
            className: "py-2 px-3",
            render: (_, r) => cyclesByVehicleId[r.id]?.maintNextKm ?? "-",
          },
          {
            title: "到期提醒",
            className: "py-2 px-3",
            render: (_, r) => {
              const hint = getDueHint(cyclesByVehicleId[r.id]);
              const tone =
                hint.color === "green"
                  ? "success"
                  : hint.color === "gold"
                    ? "warning"
                    : hint.color === "red"
                      ? "danger"
                      : "neutral";
              return <StatusPill tone={tone} label={hint.text} />;
            },
          },
          {
            title: "备注",
            className: "py-2 px-3",
            render: (_, r) => parseRemarkMeta(r.remark).remarkBody || "-",
          },
          {
            title: "操作",
            width: 48,
            className: "py-2 px-3",
            render: (_, r) => (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    { key: "view", label: "查看" },
                    ...(canManage ? [{ type: "divider" } as const, { key: "edit", label: "编辑" }, { key: "delete", label: "删除", danger: true }] : []),
                  ],
                  onClick: ({ key }) => {
                    if (key === "view") void openView(r, "base");
                    if (key === "edit") openEdit(r, "basic");
                    if (key === "delete") setPendingScrap(r);
                  },
                }}
              >
                <Button type="text" icon={<MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />} />
              </Dropdown>
            ),
          },
        ]}
      />
      )}

      <Modal
        title="车辆详情"
        open={viewOpen}
        centered
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={isNarrow ? "calc(100vw - 16px)" : 920}
        className="ve-vehicles-modal"
      >
        {viewVehicle ? (
          viewLoading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            (() => {
              const viewVehicleMeta = parseRemarkMeta(viewVehicle.remark);
              const insuranceCompulsoryKeys = viewVehicleMeta.insuranceCompulsoryAttachmentKeys;
              const insuranceCommercialKeys = viewVehicleMeta.insuranceCommercialAttachmentKeys;
              const drivingLicenseKeys = viewDrivingLicenseKeys;
              return (
            <Tabs
              activeKey={viewTab}
              onChange={(k) => setViewTab(k)}
              items={[
                {
                  key: "base",
                  label: "基础信息",
                  children: (
                    <div className="space-y-3">
                      {canManage ? (
                        <div className="flex justify-end">
                          <Button
                            type="primary"
                            size="small"
                            className={actionBtn.primary}
                            onClick={() => {
                              setViewOpen(false);
                              openEdit(viewVehicle, "basic");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            编辑
                          </Button>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        {[
                          { label: "号牌号码", value: viewVehicle.plateNo },
                          { label: "车辆类型", value: viewVehicle.vehicleType },
                          { label: "品牌型号", value: viewVehicle.brandModel || "-" },
                          { label: "车辆识别代号", value: viewVehicle.vin || "-" },
                          { label: "发动机号", value: viewVehicle.engineNo || "-" },
                          { label: "注册日期", value: viewVehicle.regDate || "-" },
                          { label: "当前里程", value: String(viewVehicle.mileage ?? "-") },
                          {
                            label: "车辆状态",
                            value: <StatusPill tone={vehicleStatusTone(viewVehicle.status)} label={statusMeta[viewVehicle.status].label} />,
                          },
                          { label: "使用部门", value: viewVehicle.ownerDept || "-" },
                          { label: "责任人", value: viewVehicle.ownerPerson || "-" },
                        ].map((f) => (
                          <div key={f.label} className="rounded-md border border-slate-200 bg-white p-2.5">
                            <div className="text-xs font-medium tracking-wide text-slate-500">{f.label}</div>
                            <div className="mt-1 min-w-0 break-words text-sm font-medium text-slate-900">{f.value as any}</div>
                          </div>
                        ))}
                        <div className="rounded-md border border-slate-200 bg-white p-2.5 md:col-span-2">
                          <div className="text-xs font-medium tracking-wide text-slate-500">备注</div>
                          <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                            {viewVehicleMeta.remarkBody || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "cycle",
                  label: "周期信息",
                  children: (
                    <div className="space-y-3">
                      {canManage ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="small"
                            className={actionBtn.secondary}
                            onClick={() => {
                              setViewOpen(false);
                              openEdit(viewVehicle, "insurance");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            编辑保险
                          </Button>
                          <Button
                            size="small"
                            className={actionBtn.secondary}
                            onClick={() => {
                              setViewOpen(false);
                              openEdit(viewVehicle, "annual");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            编辑年审
                          </Button>
                          <Button
                            size="small"
                            className={actionBtn.secondary}
                            onClick={() => {
                              setViewOpen(false);
                              openEdit(viewVehicle, "maint");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            编辑保养
                          </Button>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        {(() => {
                          const insurance = parseInsuranceBundle(viewCycle);
                          const insuranceMeta = parseRemarkMeta(viewVehicle?.remark);
                          return [
                            { label: "交强险-公司", value: insurance.compulsory.vendor || "-" },
                            { label: "交强险-投保", value: insurance.compulsory.start || "-" },
                            { label: "交强险-到期", value: insurance.compulsory.expiry || "-" },
                            { label: "交强险-附件", value: `已上传 ${insuranceMeta.insuranceCompulsoryAttachmentKeys.length} 张` },
                            { label: "商业险-公司", value: insurance.commercial.vendor || "-" },
                            { label: "商业险-投保", value: insurance.commercial.start || "-" },
                            { label: "商业险-到期", value: insurance.commercial.expiry || "-" },
                            { label: "商业险-附件", value: `已上传 ${insuranceMeta.insuranceCommercialAttachmentKeys.length} 张` },
                            { label: "上次审车日期", value: viewCycle?.annualLastDate || "-" },
                            { label: "年审到期日", value: viewCycle?.annualExpiry || "-" },
                            { label: "上次保养日期", value: viewCycle?.maintLastDate || "-" },
                            { label: "保养间隔天数", value: String(viewCycle?.maintIntervalDays ?? "-") },
                            { label: "保养间隔里程", value: String(viewCycle?.maintIntervalKm ?? "-") },
                            { label: "下次保养日期", value: viewCycle?.maintNextDate || "-" },
                            { label: "下次保养里程", value: String(viewCycle?.maintNextKm ?? "-") },
                          ];
                        })().map((f) => (
                          <div key={f.label} className="rounded-md border border-slate-200 bg-white p-2.5">
                            <div className="text-xs font-medium tracking-wide text-slate-500">{f.label}</div>
                            <div className="mt-1 text-sm font-medium text-slate-900">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "files",
                  label: "附件",
                  children: (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <AttachmentRefreshButton disabled={filesRefreshing} onClick={() => void refreshViewFilesState()} />
                      </div>
                      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        <div className="rounded-md border border-slate-200 bg-white p-2.5">
                          <div className="text-xs font-medium tracking-wide text-slate-500">交强险附件</div>
                          <div className="mt-1 text-sm text-slate-800">
                            <AttachmentStatus uploaded={insuranceCompulsoryKeys.length > 0} count={insuranceCompulsoryKeys.length} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="small"
                              className={actionBtn.ghost}
                              disabled={insuranceCompulsoryKeys.length === 0}
                              onClick={() => insuranceCompulsoryKeys.length > 0 && void viewAttachment(insuranceCompulsoryKeys, "insuranceCompulsory")}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              查看
                            </Button>
                            {canManage ? (
                              <Button
                                size="small"
                                className={actionBtn.secondary}
                                onClick={() => {
                                  setViewOpen(false);
                                  openEdit(viewVehicle, "insurance", "insuranceUpload");
                                }}
                              >
                                <Upload className="h-3.5 w-3.5" />
                                去上传
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white p-2.5">
                          <div className="text-xs font-medium tracking-wide text-slate-500">商业险附件</div>
                          <div className="mt-1 text-sm text-slate-800">
                            <AttachmentStatus uploaded={insuranceCommercialKeys.length > 0} count={insuranceCommercialKeys.length} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="small"
                              className={actionBtn.ghost}
                              disabled={insuranceCommercialKeys.length === 0}
                              onClick={() => insuranceCommercialKeys.length > 0 && void viewAttachment(insuranceCommercialKeys, "insuranceCommercial")}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              查看
                            </Button>
                            {canManage ? (
                              <Button
                                size="small"
                                className={actionBtn.secondary}
                                onClick={() => {
                                  setViewOpen(false);
                                  openEdit(viewVehicle, "insurance", "insuranceUpload");
                                }}
                              >
                                <Upload className="h-3.5 w-3.5" />
                                去上传
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-md border border-slate-200 bg-white p-2.5">
                          <div className="text-xs font-medium tracking-wide text-slate-500">行驶证附件</div>
                          <div className="mt-1 text-sm text-slate-800">
                            <AttachmentStatus uploaded={drivingLicenseKeys.length > 0} count={drivingLicenseKeys.length} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="small"
                              className={actionBtn.ghost}
                              disabled={drivingLicenseKeys.length === 0}
                              onClick={() => {
                                if (drivingLicenseKeys.length > 0) viewAttachment(drivingLicenseKeys, "driving");
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              查看
                            </Button>
                            {canManage ? (
                              <Button
                                size="small"
                                className={actionBtn.secondary}
                                onClick={() => {
                                  setViewOpen(false);
                                  openEdit(viewVehicle, "basic", "drivingLicenseUpload");
                                }}
                              >
                                <Upload className="h-3.5 w-3.5" />
                                去上传
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                        提示：附件为受保护资源，点击“查看”会通过后端鉴权后打开。
                      </div>
                    </div>
                  ),
                },
              ]}
            />
              );
            })()
          )
        ) : null}
      </Modal>

      <Modal
        title="确认删除"
        open={!!pendingScrap}
        centered
        width={520}
        onCancel={() => setPendingScrap(null)}
        footer={
          <Space size={8}>
            <Button className={actionBtn.neutral} onClick={() => setPendingScrap(null)}>
              取消
            </Button>
            <Button
              type="primary"
              className={actionBtn.primary}
              onClick={() => {
                if (!pendingScrap) return;
                void setStatus(pendingScrap.id, "scrapped");
                setPendingScrap(null);
              }}
            >
              确认删除
            </Button>
          </Space>
        }
      >
        <div className="text-sm text-slate-700">
          确认删除该车辆吗？此操作会将车辆状态设置为“报废”。
          {pendingScrap ? <div className="mt-2 text-xs text-slate-500">车辆：{pendingScrap.plateNo}</div> : null}
        </div>
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
          const prevInsuranceKeys = viewInsuranceKeys;
          const prevDrivingKeys = viewDrivingLicenseKeys;
          const prevInsuranceAttachmentKey = viewCycle?.insuranceAttachmentKey ?? null;

          if (viewerSource === "insuranceCompulsory" || viewerSource === "insuranceCommercial") {
            const currentRemark = viewVehicleRef.current?.remark;
            const parsed = parseRemarkMeta(currentRemark);
            const nextCompulsory = viewerSource === "insuranceCompulsory" ? nextKeys : parsed.insuranceCompulsoryAttachmentKeys;
            const nextCommercial = viewerSource === "insuranceCommercial" ? nextKeys : parsed.insuranceCommercialAttachmentKeys;
            const merged = normalizeAttachmentKeys([...nextCompulsory, ...nextCommercial]);
            setViewInsuranceKeys(merged);
            setViewCycle((prev) => (prev ? { ...prev, insuranceAttachmentKey: merged[0] || null } : prev));
          }
          if (viewerSource === "driving") {
            setViewDrivingLicenseKeys(nextKeys);
          }

          const run = async () => {
            const ok = await persistViewerAttachmentChanges(viewerSource, nextKeys);
            if (ok) return;
            // rollback optimistic updates when persistence fails
            setViewInsuranceKeys(prevInsuranceKeys);
            setViewDrivingLicenseKeys(prevDrivingKeys);
            setViewCycle((prev) => (prev ? { ...prev, insuranceAttachmentKey: prevInsuranceAttachmentKey } : prev));
          };
          viewerPersistQueueRef.current = viewerPersistQueueRef.current.then(run).catch(() => undefined);
        }}
        title="附件预览"
        onClose={() => {
          const closingVehicleId = viewVehicleRef.current?.id;
          setViewerPath(null);
          setViewerPaths([]);
          setViewerInitialIndex(0);
          setViewerSource("other");
          if (closingVehicleId) {
            viewerPersistQueueRef.current = viewerPersistQueueRef.current
              .then(async () => {
                await reconcileViewAttachmentState(closingVehicleId);
              })
              .catch(() => undefined);
          }
        }}
      />

      <Modal
        title={editing ? "编辑车辆" : "新增车辆"}
        open={open}
        centered
        onCancel={requestCloseEditModal}
        footer={
          <Space size={8}>
            <Button className={actionBtn.neutral} onClick={requestCloseEditModal}>
              取消
            </Button>
            <Button
              className={actionBtn.secondary}
              onClick={() => {
                const idx = EDIT_TAB_ORDER.indexOf(editTab as (typeof EDIT_TAB_ORDER)[number]);
                if (idx <= 0) return;
                setEditTab(EDIT_TAB_ORDER[idx - 1]);
              }}
              disabled={EDIT_TAB_ORDER.indexOf(editTab as (typeof EDIT_TAB_ORDER)[number]) <= 0}
            >
              上一步
            </Button>
            <Button
              className={actionBtn.secondary}
              onClick={() => {
                const idx = EDIT_TAB_ORDER.indexOf(editTab as (typeof EDIT_TAB_ORDER)[number]);
                if (idx >= EDIT_TAB_ORDER.length - 1) return;
                setEditTab(EDIT_TAB_ORDER[idx + 1]);
              }}
              disabled={EDIT_TAB_ORDER.indexOf(editTab as (typeof EDIT_TAB_ORDER)[number]) >= EDIT_TAB_ORDER.length - 1}
            >
              下一步
            </Button>
            {!editing ? (
              <Button className={actionBtn.secondary} onClick={() => void submit({ continueCreate: true })}>
                保存并继续新增
              </Button>
            ) : null}
            <Button type="primary" className={actionBtn.primary} onClick={() => void submit()}>
              保存
            </Button>
          </Space>
        }
        width={isNarrow ? "calc(100vw - 16px)" : 920}
        className="ve-vehicles-modal"
      >
        <div ref={editScrollWrapRef} className="max-h-[70vh] overflow-y-auto p-3 sm:p-4">
          <Form form={form} layout="vertical" onValuesChange={() => setEditDirty(true)}>
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
                      <Form.Item label={requiredLabel("号牌号码")}>
                        <Controller
                          name="plateNo"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              autoFocus={open && editTab === "basic"}
                              placeholder="在后缀继续输入，如 D12345；非豫A请改掉前缀"
                              onChange={(e) => field.onChange(e.target.value.replace(/[a-z]/g, (c) => c.toUpperCase()))}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={requiredLabel("车辆类型")}>
                        <Controller
                          name="vehicleType"
                          control={control}
                          render={({ field }) => <Select {...field} options={vehicleTypeOptions} placeholder="请选择车辆类型" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={requiredLabel("能源类型")} name="energyType" rules={[{ required: true }]}>
                        <Controller
                          name="energyType"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              allowClear
                              options={energyTypeOptions}
                              placeholder="请选择能源类型"
                              onChange={(next) => {
                                field.onChange(next);
                                form.setFieldValue("energyType", next);
                              }}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={(
                          <span>
                            使用性质
                            <span className="ml-0.5 text-red-500">*</span>
                            <Tooltip title="用于区分营运/非营运等业务场景，影响后续统计口径">
                              <span className="ml-1 cursor-help text-slate-400">?</span>
                            </Tooltip>
                          </span>
                        )}
                        name="usageNature"
                        rules={[{ required: true }]}
                      >
                        <Controller
                          name="usageNature"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              allowClear
                              options={usageNatureOptions}
                              placeholder="如：营运/非营运"
                              onChange={(next) => {
                                field.onChange(next);
                                form.setFieldValue("usageNature", next);
                              }}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={requiredLabel("品牌型号")}>
                        <Controller
                          name="brandModel"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="如：丰田凯美瑞" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={requiredLabel("车辆识别代号")}
                        validateStatus={vinHint ? "warning" : undefined}
                        help={vinHint || undefined}
                      >
                        <Controller
                          name="vin"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <Input
                                {...field}
                                placeholder={`${VIN_LENGTH} 位 VIN`}
                                maxLength={VIN_LENGTH}
                                className="pr-16"
                                onChange={(e) => {
                                  const value = e.target.value.toUpperCase().replace(/\s+/g, "");
                                  field.onChange(value);
                                  setVinCountHint(`${value.length}/${VIN_LENGTH}`);
                                  if (value.length === VIN_LENGTH) {
                                    window.setTimeout(() => engineNoInputRef.current?.focus(), 0);
                                  }
                                  if (!value) {
                                    setVinHint("");
                                    return;
                                  }
                                  setVinHint(/^[A-HJ-NPR-Z0-9]{0,17}$/.test(value) ? "" : "VIN 仅支持字母数字，且不含 I/O/Q");
                                }}
                                onBlur={(e) => {
                                  const value = (e.target.value ?? "").toUpperCase().replace(/\s+/g, "");
                                  field.onChange(value);
                                  setVinCountHint(`${value.length}/${VIN_LENGTH}`);
                                  if (!value) {
                                    setVinHint("");
                                    return;
                                  }
                                  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(value)) {
                                    setVinHint(`VIN 必须为 ${VIN_LENGTH} 位字母数字，且不含 I/O/Q`);
                                    return;
                                  }
                                  setVinHint("");
                                }}
                              />
                              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">
                                {vinCountHint}
                              </span>
                            </div>
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={requiredLabel("发动机号")} validateStatus={engineNoHint ? "warning" : undefined} help={engineNoHint || undefined}>
                        <Controller
                          name="engineNo"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              ref={engineNoInputRef}
                              placeholder="请输入发动机号"
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase().replace(/\s+/g, "");
                                field.onChange(value);
                                if (!value) {
                                  setEngineNoHint("");
                                  return;
                                }
                                setEngineNoHint(value.length >= 4 ? "" : "发动机号建议至少 4 位");
                              }}
                              onBlur={(e) => {
                                const value = (e.target.value ?? "").toUpperCase().replace(/\s+/g, "");
                                field.onChange(value);
                                if (!value) {
                                  setEngineNoHint("");
                                  return;
                                }
                                setEngineNoHint(value.length >= 4 ? "" : "发动机号建议至少 4 位");
                              }}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="注册日期">
                        <Controller
                          name="regDate"
                          control={control}
                          render={({ field }) => <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择注册日期" value={field.value} onChange={field.onChange} />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="发证日期">
                        <Controller
                          name="issueDate"
                          control={control}
                          render={({ field }) => <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择发证日期" value={field.value} onChange={field.onChange} />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="档案编号（选填）">
                        <Controller
                          name="archiveNo"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="例：DA-2026-0001" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="核定载人数">
                        <Controller
                          name="loadPeople"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="如：5"
                              onChange={(e) => {
                                const digits = String(e.target.value ?? "").replace(/[^\d]/g, "");
                                field.onChange(digits);
                              }}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="核定载质量" validateStatus={loadWeightHint ? "warning" : undefined} help={loadWeightHint || undefined}>
                        <Controller
                          name="loadWeight"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              inputMode="decimal"
                              placeholder="例：3500（自动补全为 kg）"
                              onChange={(e) => {
                                const raw = e.target.value ?? "";
                                const cleaned = raw.replace(/[^\d.]/g, "");
                                field.onChange(cleaned);
                                if (!cleaned) {
                                  setLoadWeightHint("");
                                  return;
                                }
                                setLoadWeightHint(/^\d+(\.\d{1,2})?$/.test(cleaned) ? "" : "请输入数字，最多保留 2 位小数");
                              }}
                              onBlur={(e) => {
                                const raw = (e.target.value ?? "").trim();
                                if (!raw) {
                                  setLoadWeightHint("");
                                  return;
                                }
                                const numeric = raw.replace(/[^\d.]/g, "");
                                if (!/^\d+(\.\d{1,2})?$/.test(numeric)) {
                                  setLoadWeightHint("请输入数字，最多保留 2 位小数");
                                  return;
                                }
                                field.onChange(`${numeric}kg`);
                                setLoadWeightHint("");
                              }}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="外廓尺寸" validateStatus={dimensionsHint ? "warning" : undefined} help={dimensionsHint || undefined}>
                        <Controller
                          name="dimensions"
                          control={control}
                          render={({ field }) => {
                            const parts = parseDimensionsParts(field.value);
                            const updatePart = (key: "length" | "width" | "height", v: string) => {
                              const cleaned = v.replace(/[^\d]/g, "").slice(0, 4);
                              const next = {
                                length: key === "length" ? cleaned : parts.length,
                                width: key === "width" ? cleaned : parts.width,
                                height: key === "height" ? cleaned : parts.height,
                              };
                              field.onChange(composeDimensions(next.length, next.width, next.height));
                            };
                            const validateParts = () => {
                              const filled = [parts.length, parts.width, parts.height].filter((x) => x.length > 0).length;
                              if (filled === 0) {
                                setDimensionsHint("");
                                return;
                              }
                              if (filled < 3) {
                                setDimensionsHint("请补齐长/宽/高三段尺寸（mm）");
                                return;
                              }
                              setDimensionsHint("");
                            };
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    value={parts.length}
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="长"
                                    className="w-full"
                                    onChange={(e) => updatePart("length", e.target.value)}
                                    onBlur={validateParts}
                                  />
                                  <span className="text-slate-400">×</span>
                                  <Input
                                    value={parts.width}
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="宽"
                                    className="w-full"
                                    onChange={(e) => updatePart("width", e.target.value)}
                                    onBlur={validateParts}
                                  />
                                  <span className="text-slate-400">×</span>
                                  <Input
                                    value={parts.height}
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="高"
                                    className="w-full"
                                    onChange={(e) => updatePart("height", e.target.value)}
                                    onBlur={validateParts}
                                  />
                                </div>
                              </div>
                            );
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="所有人">
                        <Controller
                          name="ownerName"
                          control={control}
                          render={({ field }) => (
                            <div className="space-y-1">
                              <AutoComplete
                                className="w-full"
                                style={{ width: "100%" }}
                                options={ownerNameSelectOptions}
                                value={field.value}
                                onChange={(value) => {
                                  field.onChange(value);
                                  applyOwnerAddressByName(value);
                                }}
                                onBlur={(e) => {
                                  applyOwnerAddressByName((e.target as HTMLInputElement).value ?? "");
                                }}
                                placeholder="请选择或输入所有人（系统配置中可维护对照表）"
                                filterOption={(inputValue, option) =>
                                  (option?.value ?? "").toString().toLowerCase().includes(inputValue.trim().toLowerCase())
                                }
                                onSelect={(value) => {
                                  field.onChange(value);
                                  applyOwnerAddressByName(value);
                                }}
                              />
                            </div>
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="住址">
                        <Controller
                          name="ownerAddress"
                          control={control}
                          render={({ field }) => (
                            <div className="space-y-1">
                              <Input
                                {...field}
                                placeholder="选择所有人后自动填入，也可手动修改"
                                onChange={(e) => {
                                  setOwnerAddressTouched(true);
                                  field.onChange(e);
                                }}
                              />
                              {ownerAddressTouched ? (
                                <button
                                  type="button"
                                  className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-700"
                                  onClick={() => {
                                    setOwnerAddressTouched(false);
                                    applyOwnerAddressByName(String(form.getFieldValue("ownerName") ?? ""));
                                  }}
                                >
                                  恢复自动回填
                                </button>
                              ) : null}
                            </div>
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="本次保养里程">
                        <Controller
                          name="mileage"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              placeholder="当前里程表读数（km）"
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={(
                          <span>
                            下次保养里程
                            <Tooltip title="建议大于本次保养里程，避免保养计划倒挂">
                              <span className="ml-1 cursor-help text-slate-400">?</span>
                            </Tooltip>
                          </span>
                        )}
                      >
                        <Controller
                          name="maintNextKm"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                field.onChange(value);
                                const current = Number(form.getFieldValue("mileage") ?? 0);
                                if (Number.isFinite(current) && Number.isFinite(value) && value > 0 && value < current) {
                                  message.warning("下次保养里程小于本次里程，请确认");
                                }
                              }}
                              placeholder="计划保养里程（km）"
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="车辆状态">
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              placeholder="请选择车辆状态"
                              options={statusOptions as unknown as { label: string; value: VehicleForm["status"] }[]}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={requiredLabel("使用部门")}>
                        <Controller
                          name="ownerDept"
                          control={control}
                          render={({ field }) => (
                            <AutoComplete
                              className="w-full"
                              style={{ width: "100%" }}
                              options={ownerDeptSelectOptions}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="请选择或输入部门"
                              filterOption={(inputValue, option) =>
                                (option?.value ?? "").toString().toLowerCase().includes(inputValue.trim().toLowerCase())
                              }
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={requiredLabel("责任人")}>
                        <Controller
                          name="ownerPerson"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="请输入责任人" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="备注">
                        <Controller
                          name="remark"
                          control={control}
                          render={({ field }) => <Input.TextArea rows={4} placeholder="其他补充说明（不含结构化元数据行）" value={field.value ?? ""} onChange={field.onChange} />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <div ref={drivingLicenseUploadRef}>
                        <Form.Item label="上传行驶证">
                          <R2AttachmentUploader
                            value={getRhfValues().drivingLicenseAttachmentKey}
                            keys={(form.getFieldValue("drivingLicenseAttachmentKeys") as string[] | undefined) ?? []}
                            onUploaded={(key) => {
                              setRhfValue("drivingLicenseAttachmentKey", key);
                              form.setFieldValue("drivingLicenseAttachmentKey", key);
                              const next = appendAttachmentKeys("drivingLicenseAttachmentKeys", key);
                              form.setFieldValue("drivingLicenseAttachmentKeys", next);
                            }}
                            description="拖拽或点击上传行驶证扫描件（图片/PDF）"
                          />
                        </Form.Item>
                      </div>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "insurance",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${tabDotClass(getEditTabStatus("insurance"))}`} />
                    保险信息
                  </span>
                ),
                children: (
                  <Row gutter={16}>
                    <Col span={24}>
                      <div ref={insuranceUploadRef} className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                        <div className="mb-2 text-xs font-medium text-slate-600">交强险</div>
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item label="保险公司" name="insuranceCompulsoryVendor">
                              <Input placeholder="请输入交强险保险公司" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="投保日期" name="insuranceCompulsoryStart">
                              <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择投保日期" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="到期日期" name="insuranceCompulsoryExpiry">
                              <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择到期日期" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item label="上传交强险保单" className="mb-0">
                          <R2AttachmentUploader
                            value={form.getFieldValue("insuranceAttachmentKey")}
                            keys={(form.getFieldValue("insuranceCompulsoryAttachmentKeys") as string[] | undefined) ?? []}
                            onUploaded={(key) => {
                              const nextComp = appendAttachmentKeys("insuranceCompulsoryAttachmentKeys", key);
                              const prevCom = (form.getFieldValue("insuranceCommercialAttachmentKeys") as string[] | undefined) ?? [];
                              syncInsuranceAttachmentFields(nextComp, prevCom);
                            }}
                            description="拖拽或点击上传交强险附件"
                          />
                        </Form.Item>
                      </div>
                    </Col>
                    <Col span={24}>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                        <div className="mb-2 text-xs font-medium text-slate-600">商业险</div>
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item label="保险公司" name="insuranceCommercialVendor">
                              <Input placeholder="请输入商业险保险公司" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="投保日期" name="insuranceCommercialStart">
                              <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择投保日期" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="到期日期" name="insuranceCommercialExpiry">
                              <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择到期日期" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item label="上传商业险保单" className="mb-0">
                          <R2AttachmentUploader
                            value={form.getFieldValue("insuranceAttachmentKey")}
                            keys={(form.getFieldValue("insuranceCommercialAttachmentKeys") as string[] | undefined) ?? []}
                            onUploaded={(key) => {
                              const nextCom = appendAttachmentKeys("insuranceCommercialAttachmentKeys", key);
                              const prevComp = (form.getFieldValue("insuranceCompulsoryAttachmentKeys") as string[] | undefined) ?? [];
                              syncInsuranceAttachmentFields(prevComp, nextCom);
                            }}
                            description="拖拽或点击上传商业险附件"
                          />
                        </Form.Item>
                      </div>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "annual",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${tabDotClass(getEditTabStatus("annual"))}`} />
                    年审信息
                  </span>
                ),
                children: (
                  <Row gutter={16}>
                    <Col span={24}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                        <div className="text-xs text-slate-600">支持根据“上次审车日期 + 周期(月)”自动计算年审到期日</div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="small"
                            className={actionBtn.secondary}
                            onClick={() => {
                              const base = toYmd(form.getFieldValue("annualExpiry"));
                              const months = normalizePositiveInteger(form.getFieldValue("annualIntervalMonths")) ?? DEFAULT_ANNUAL_INTERVAL_MONTHS;
                              if (!base) return message.warning("请先填写当前年审到期日");
                              const next = calcAnnualExpiry(base, months);
                              if (!next) return message.warning("请检查到期日或周期（月）");
                              form.setFieldValue("annualLastDate", dayjs(base, "YYYY-MM-DD"));
                              form.setFieldValue("annualExpiry", dayjs(next, "YYYY-MM-DD"));
                            }}
                          >
                            复制上次并生成下次
                          </Button>
                          <Button
                            size="small"
                            className={actionBtn.secondary}
                            onClick={() => {
                              const last = toYmd(form.getFieldValue("annualLastDate"));
                              const months = normalizePositiveInteger(form.getFieldValue("annualIntervalMonths")) ?? DEFAULT_ANNUAL_INTERVAL_MONTHS;
                              if (!last) return message.warning("请先填写上次审车日期");
                              const next = calcAnnualExpiry(last, months);
                              if (!next) return message.warning("请检查日期或周期（月）");
                              form.setFieldValue("annualExpiry", dayjs(next, "YYYY-MM-DD"));
                            }}
                          >
                            自动计算到期日
                          </Button>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="上次审车日期" name="annualLastDate" rules={[{ required: true }]}>
                        <DatePicker
                          className="w-full"
                          format="YYYY-MM-DD"
                          placeholder="选择上次审车日期"
                          onChange={(v) => {
                            form.setFieldValue("annualLastDate", v);
                            const months = normalizePositiveInteger(form.getFieldValue("annualIntervalMonths")) ?? DEFAULT_ANNUAL_INTERVAL_MONTHS;
                            if (!v) return;
                            const next = calcAnnualExpiry(dayjs(v).format("YYYY-MM-DD"), months);
                            if (next) form.setFieldValue("annualExpiry", dayjs(next, "YYYY-MM-DD"));
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="年审到期日" name="annualExpiry" rules={[{ required: true }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择年审到期日" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="年审周期（月）" name="annualIntervalMonths" initialValue={DEFAULT_ANNUAL_INTERVAL_MONTHS}>
                        <Input
                          inputMode="numeric"
                          placeholder="默认 12"
                          onChange={(e) => {
                            const digits = String(e.target.value ?? "").replace(/[^\d]/g, "");
                            form.setFieldValue("annualIntervalMonths", digits ? Number(digits) : undefined);
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "maint",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${tabDotClass(getEditTabStatus("maint"))}`} />
                    保养信息
                  </span>
                ),
                children: (
                  <Row gutter={16}>
                    <Col span={24}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                        <div className="text-xs text-slate-600">策略：日期或里程先到即触发保养提醒（双触发）</div>
                        <Button
                          size="small"
                          className={actionBtn.secondary}
                          onClick={() => {
                            const prevNextDate = String(form.getFieldValue("maintNextDate") ?? "").trim();
                            const prevNextKm = Number(form.getFieldValue("maintNextKm") ?? 0);
                            const intervalDays = normalizePositiveInteger(form.getFieldValue("maintIntervalDays")) ?? 0;
                            const intervalKm = normalizePositiveInteger(form.getFieldValue("maintIntervalKm")) ?? 0;
                            if (!prevNextDate && prevNextKm <= 0) {
                              message.warning("请先填写一次“下次保养日期/里程”作为基准");
                              return;
                            }
                            if (prevNextDate) {
                              form.setFieldValue("maintLastDate", dayjs(prevNextDate, "YYYY-MM-DD"));
                              if (intervalDays > 0) {
                                form.setFieldValue("maintNextDate", dayjs(prevNextDate, "YYYY-MM-DD").add(intervalDays, "day"));
                              }
                            }
                            if (prevNextKm > 0) {
                              form.setFieldValue("mileage", prevNextKm);
                              if (intervalKm > 0) {
                                form.setFieldValue("maintNextKm", prevNextKm + intervalKm);
                              }
                            }
                          }}
                        >
                          复制上次并生成下次计划
                        </Button>
                      </div>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="上次保养日期" name="maintLastDate" rules={[{ required: true }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择上次保养日期" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="下次保养日期" name="maintNextDate" rules={[{ required: true }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择下次保养日期" />
                      </Form.Item>
                      <div className="mt-[-8px] mb-2 text-[11px] text-slate-500">建议结合“保养间隔天数”自动推进，避免遗漏</div>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="保养间隔天数" name="maintIntervalDays" rules={[{ required: true }]}>
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="请输入天数"
                          onChange={(e) => {
                            const digits = String(e.target.value ?? "").replace(/[^\d]/g, "");
                            form.setFieldValue("maintIntervalDays", digits ? Number(digits) : undefined);
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="保养间隔里程" name="maintIntervalKm" rules={[{ required: true }]}>
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="请输入里程（km）"
                          onChange={(e) => {
                            const digits = String(e.target.value ?? "").replace(/[^\d]/g, "");
                            form.setFieldValue("maintIntervalKm", digits ? Number(digits) : undefined);
                          }}
                        />
                      </Form.Item>
                      <div className="mt-[-8px] mb-2 text-[11px] text-slate-500">与下次保养里程联动，按先到条件触发</div>
                    </Col>
                  </Row>
                ),
              },
            ]}
            />
          </Form>
        </div>
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
    </div>
    </PageContainer>
  );
}

