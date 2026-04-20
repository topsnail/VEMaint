import { App, AutoComplete, Button, Col, DatePicker, Descriptions, Dropdown, Form, Input, Modal, Popconfirm, Row, Select, Skeleton, Space, Table, Tabs, Tooltip } from "@/components/ui/legacy";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm as useRhfForm } from "react-hook-form";
import type { Vehicle, VehicleCycle } from "../types";
import { R2AttachmentUploader } from "../components/R2AttachmentUploader";
import { useVehiclesTableData } from "../hooks/useVehiclesTableData";
import {
  fetchVehicleCycle,
  requestPutVehicleCycles,
  requestPutVehicleStatus,
  requestUpsertVehicle,
} from "../hooks/vehiclesApi";
import { openProtectedFile } from "../lib/http";
import { PageContainer } from "../components/PageContainer";
import { StatusPill } from "../components/StatusPill";
import { listTableScroll, listTableSticky } from "../lib/tableConfig";
import { vehicleSubmitSchema } from "../lib/schemas";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
  insuranceType?: string;
  insuranceVendor?: string;
  insuranceStart?: string;
  insuranceExpiry?: string;
  insuranceAttachmentKey?: string;
  annualLastDate?: string;
  annualExpiry?: string;
  maintLastDate?: string;
  maintIntervalDays?: number;
  maintIntervalKm?: number;
  maintNextDate?: string;
  maintNextKm?: number;
  remark?: string;
};

/**
 * 新增车辆时节号默认值：地区简称 + 间隔号，便于在「相同前缀」下继续录入后半段（发牌代号+序号）。
 * 其他地区车辆可整段删除后重输；中间点仅为录入习惯，可按需保留或删除。
 */
const DEFAULT_PLATE_NO_PREFIX = "豫A·";

export function VehiclesPage({ canManage }: { canManage: boolean }) {
  const { message } = App.useApp();
  const initialParams = new URLSearchParams(window.location.search);
  const { rows, cyclesByVehicleId, dropdowns, ownerDirectory, loading: listLoading, load, loadDropdowns } = useVehiclesTableData();
  const [q, setQ] = useState(() => initialParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);
  const [viewCycle, setViewCycle] = useState<VehicleCycle | null>(null);
  const [viewTab, setViewTab] = useState("base");
  const [editTab, setEditTab] = useState("basic");
  const [filterStatus, setFilterStatus] = useState<string>(() => initialParams.get("status") ?? "");
  const [filterVehicleType, setFilterVehicleType] = useState<string>("");
  const [filterOwnerDept, setFilterOwnerDept] = useState<string>("");
  const [filterNearDue, setFilterNearDue] = useState<string>(() => initialParams.get("due") ?? "");
  const [filterIncomplete, setFilterIncomplete] = useState<string>("");
  const [form] = Form.useForm<VehicleForm>();
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
    };
    const body = lines
      .filter(
        (l) =>
          !l.startsWith("档案编号:") &&
          !l.startsWith("所有人:") &&
          !l.startsWith("发证日期:") &&
          !l.startsWith("住址:") &&
          !l.startsWith("行驶证附件Key:"),
      )
      .join("\n");
    return { ...meta, remarkBody: body };
  };

  const renderTextInput = (key: string, placeholder?: string) => {
    const normalizeDropdownOptions = (source: string[] | undefined) => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const raw of source ?? []) {
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
      return result;
    };
    const options = normalizeDropdownOptions(dropdowns[key]);
    if (options.length === 0) return <Input placeholder={placeholder} />;
    return <Select allowClear showSearch options={options.map((v) => ({ label: v, value: v }))} placeholder={placeholder} />;
  };

  const statusOptions = [
    { label: "正常", value: "normal" },
    { label: "维修中", value: "repairing" },
    { label: "停用", value: "stopped" },
    { label: "报废", value: "scrapped" },
  ] as const;
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
      !!meta.drivingLicenseAttachmentKey,
      !!cycle?.insuranceType,
      !!cycle?.insuranceVendor,
      !!cycle?.insuranceStart,
      !!cycle?.insuranceExpiry,
      !!cycle?.insuranceAttachmentKey,
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
    const candidates = [
      { label: "保险", date: cycle.insuranceExpiry },
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

  const ownerDirectoryMap = useMemo(() => new Map(ownerDirectory.map((o) => [o.name, o.address])), [ownerDirectory]);
  const ownerNameSelectOptions = useMemo(
    () => ownerDirectory.map((o) => ({ label: o.name, value: o.name })),
    [ownerDirectory],
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
    setOpen(true);
    params.delete("create");
    const next = params.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [canManage, form]);

  const submit = async () => {
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
    const normalizePlateNo = (value: unknown) =>
      String(value ?? "")
        .toUpperCase()
        .replace(/[·•\.\-\s]/g, "")
        .trim();
    const normalizeDate = (value: unknown) => {
      if (!value) return "";
      if (typeof value === "string") return value.trim();
      if (typeof (value as { format?: (pattern: string) => string }).format === "function") {
        return (value as { format: (pattern: string) => string }).format("YYYY-MM-DD");
      }
      return "";
    };
    const regDate = normalizeDate(rhfValues.regDate ?? v.regDate);
    const issueDate = normalizeDate(rhfValues.issueDate ?? v.issueDate);
    const mergedUsageNature = [rhfValues.energyType, rhfValues.usageNature].filter(Boolean).join(" / ");
    const mergedLoadSpec = [rhfValues.loadPeople, rhfValues.loadWeight, rhfValues.dimensions].filter(Boolean).join(" / ");
    const mergedRemark = [
      rhfValues.remark,
      rhfValues.archiveNo ? `档案编号: ${rhfValues.archiveNo}` : "",
      rhfValues.ownerName ? `所有人: ${rhfValues.ownerName}` : "",
      issueDate ? `发证日期: ${issueDate}` : "",
      rhfValues.ownerAddress ? `住址: ${rhfValues.ownerAddress}` : "",
      rhfValues.drivingLicenseAttachmentKey ? `行驶证附件Key: ${rhfValues.drivingLicenseAttachmentKey}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const payload = {
      ...v,
      ...rhfValues,
      plateNo: normalizePlateNo(rhfValues.plateNo),
      regDate: regDate || null,
      loadSpec: mergedLoadSpec || null,
      usageNature: mergedUsageNature || null,
      remark: mergedRemark || null,
    };
    const res = await requestUpsertVehicle(editing?.id ?? null, payload);
    if (!res.ok) return message.error(res.error.message);
    const vehicleId = editing ? editing.id : res.data.id;
    if (vehicleId) {
      await requestPutVehicleCycles(vehicleId, {
        insuranceType: v.insuranceType || null,
        insuranceVendor: v.insuranceVendor || null,
        insuranceStart: v.insuranceStart || null,
        insuranceExpiry: v.insuranceExpiry || null,
        insuranceAttachmentKey: v.insuranceAttachmentKey || null,
        annualLastDate: v.annualLastDate || null,
        annualExpiry: v.annualExpiry || null,
        maintLastDate: v.maintLastDate || null,
        maintIntervalDays: v.maintIntervalDays ?? null,
        maintIntervalKm: v.maintIntervalKm ?? null,
        maintNextDate: v.maintNextDate || null,
        maintNextKm: v.maintNextKm ?? null,
      });
    }
    setOpen(false);
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
    setEditing(null);
    await load(q);
  };

  const setStatus = async (id: string, status: Vehicle["status"]) => {
    const res = await requestPutVehicleStatus(id, status);
    if (!res.ok) return message.error(res.error.message);
    message.success("状态已更新");
    await load(q);
  };

  const openEdit = (r: Vehicle, tab: "basic" | "insurance" | "annual" | "maint" = "basic") => {
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

    setEditing(r);
    setEditTab(tab);
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
      remark: meta.remarkBody || "",
    });
    setRhfValue("plateNo", r.plateNo);
    setRhfValue("vehicleType", r.vehicleType);
    setRhfValue("energyType", energyType || "");
    setRhfValue("usageNature", usageNature || "");
    setRhfValue("brandModel", r.brandModel);
    setRhfValue("vin", r.vin);
    setRhfValue("engineNo", r.engineNo);
    setRhfValue("regDate", r.regDate || "");
    setRhfValue("issueDate", meta.issueDate || "");
    setRhfValue("archiveNo", meta.archiveNo || "");
    setRhfValue("loadPeople", loadPeople || "");
    setRhfValue("loadWeight", loadWeight || "");
    setRhfValue("dimensions", dimensions || "");
    setRhfValue("ownerName", meta.ownerName || "");
    setRhfValue("ownerAddress", meta.ownerAddress || "");
    setRhfValue("ownerDept", r.ownerDept);
    setRhfValue("ownerPerson", r.ownerPerson);
    setRhfValue("mileage", Number(r.mileage ?? 0));
    setRhfValue("maintNextKm", Number((r as any).maintNextKm ?? 0));
    setRhfValue("status", r.status);
    setRhfValue("drivingLicenseAttachmentKey", meta.drivingLicenseAttachmentKey || "");
    setRhfValue("remark", meta.remarkBody || "");

    void fetchVehicleCycle(r.id)
      .then((cycleRes) => {
        if (cycleRes.ok && cycleRes.data.cycle) {
          const c = cycleRes.data.cycle;
          form.setFieldsValue({
            insuranceType: c.insuranceType || "",
            insuranceVendor: c.insuranceVendor || "",
            insuranceStart: c.insuranceStart || "",
            insuranceExpiry: c.insuranceExpiry || "",
            insuranceAttachmentKey: c.insuranceAttachmentKey || "",
            annualLastDate: c.annualLastDate || "",
            annualExpiry: c.annualExpiry || "",
            maintLastDate: c.maintLastDate || "",
            maintIntervalDays: c.maintIntervalDays ?? undefined,
            maintIntervalKm: c.maintIntervalKm ?? undefined,
            maintNextDate: c.maintNextDate || "",
            maintNextKm: c.maintNextKm ?? undefined,
          });
          setRhfValue("maintNextKm", Number(c.maintNextKm ?? 0));
        }
      })
      .finally(() => setOpen(true));
  };

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
    setViewVehicle(r);
    setViewCycle(null);
    setViewTab(tab);
    setViewOpen(true);
    setViewLoading(true);
    try {
      const cycleRes = await fetchVehicleCycle(r.id);
      if (cycleRes.ok) setViewCycle(cycleRes.data.cycle);
    } finally {
      setViewLoading(false);
    }
  };

  const viewAttachment = async (attachmentKey: string) => {
    const res = await openProtectedFile(`/files/${encodeURIComponent(attachmentKey)}`);
    if (!res.ok) message.error(res.error.message);
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
            onClick={() => {
              setEditing(null);
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
              setOpen(true);
            }}
          >
            新增车辆
          </Button>
        ) : undefined
      }
    >
      <div className="ve-vehicles-page space-y-4">
        <div className="ve-vehicles-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Space wrap size={[8, 8]} className="w-full">
          <Input.Search
            placeholder="搜索车牌/品牌/归属"
            defaultValue={q}
            onSearch={(v) => {
              const nextQ = v.trim();
              setQ(nextQ);
              updateQueryInUrl(nextQ);
              void load(nextQ);
            }}
            allowClear
            style={{ width: 300 }}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
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
            allowClear
            placeholder="车辆类型"
            style={{ width: 140 }}
            value={filterVehicleType || undefined}
            onChange={(v) => setFilterVehicleType(v ?? "")}
            options={vehicleTypeFilterOptions}
          />
          <Select
            allowClear
            placeholder="使用部门"
            style={{ width: 140 }}
            value={filterOwnerDept || undefined}
            onChange={(v) => setFilterOwnerDept(v ?? "")}
            options={ownerDeptFilterOptions}
          />
          <Select
            allowClear
            placeholder="到期分级"
            style={{ width: 140 }}
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
            allowClear
            placeholder="台账缺项"
            style={{ width: 140 }}
            value={filterIncomplete || undefined}
            onChange={(v) => setFilterIncomplete(v ?? "")}
            options={[{ label: "仅看不完整", value: "yes" }]}
          />
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
              canManage ? (
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      { key: "edit", label: "编辑" },
                      { key: "delete", label: "删除", danger: true },
                    ],
                    onClick: ({ key }) => {
                      if (key === "edit") openEdit(r, "basic");
                      if (key === "delete") {
                        if (window.confirm("确认删除该车辆？将车辆状态设置为“报废”")) {
                          void setStatus(r.id, "scrapped");
                        }
                      }
                    },
                  }}
                >
                  <Button type="text" icon={<MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />} />
                </Dropdown>
              ) : (
                "-"
              )
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
        width={920}
        className="ve-vehicles-modal"
      >
        {viewVehicle ? (
          viewLoading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <Tabs
              activeKey={viewTab}
              onChange={(k) => setViewTab(k)}
              items={[
                {
                  key: "base",
                  label: "基础信息",
                  children: (
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="号牌号码">{viewVehicle.plateNo}</Descriptions.Item>
                      <Descriptions.Item label="车辆类型">{viewVehicle.vehicleType}</Descriptions.Item>
                      <Descriptions.Item label="品牌型号">{viewVehicle.brandModel}</Descriptions.Item>
                      <Descriptions.Item label="车辆识别代号">{viewVehicle.vin}</Descriptions.Item>
                      <Descriptions.Item label="发动机号">{viewVehicle.engineNo}</Descriptions.Item>
                      <Descriptions.Item label="注册日期">{viewVehicle.regDate || "-"}</Descriptions.Item>
                      <Descriptions.Item label="当前里程">{viewVehicle.mileage}</Descriptions.Item>
                      <Descriptions.Item label="车辆状态">
                        <StatusPill tone={vehicleStatusTone(viewVehicle.status)} label={statusMeta[viewVehicle.status].label} />
                      </Descriptions.Item>
                      <Descriptions.Item label="使用部门">{viewVehicle.ownerDept}</Descriptions.Item>
                      <Descriptions.Item label="责任人">{viewVehicle.ownerPerson}</Descriptions.Item>
                      <Descriptions.Item label="备注" span={2}>
                        {parseRemarkMeta(viewVehicle.remark).remarkBody || "-"}
                      </Descriptions.Item>
                      {canManage ? (
                        <Descriptions.Item label="操作" span={2}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => {
                              setViewOpen(false);
                              openEdit(viewVehicle, "basic");
                            }}
                          >
                            编辑基础信息
                          </Button>
                        </Descriptions.Item>
                      ) : null}
                    </Descriptions>
                  ),
                },
                {
                  key: "cycle",
                  label: "周期信息",
                  children: (
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="保险类型">{viewCycle?.insuranceType || "-"}</Descriptions.Item>
                      <Descriptions.Item label="保险公司">{viewCycle?.insuranceVendor || "-"}</Descriptions.Item>
                      <Descriptions.Item label="投保日期">{viewCycle?.insuranceStart || "-"}</Descriptions.Item>
                      <Descriptions.Item label="到期日期">{viewCycle?.insuranceExpiry || "-"}</Descriptions.Item>
                      <Descriptions.Item label="上次审车日期">{viewCycle?.annualLastDate || "-"}</Descriptions.Item>
                      <Descriptions.Item label="年审到期日">{viewCycle?.annualExpiry || "-"}</Descriptions.Item>
                      <Descriptions.Item label="上次保养日期">{viewCycle?.maintLastDate || "-"}</Descriptions.Item>
                      <Descriptions.Item label="保养间隔天数">{viewCycle?.maintIntervalDays ?? "-"}</Descriptions.Item>
                      <Descriptions.Item label="保养间隔里程">{viewCycle?.maintIntervalKm ?? "-"}</Descriptions.Item>
                      <Descriptions.Item label="下次保养日期">{viewCycle?.maintNextDate || "-"}</Descriptions.Item>
                      <Descriptions.Item label="下次保养里程">{viewCycle?.maintNextKm ?? "-"}</Descriptions.Item>
                      {canManage ? (
                        <Descriptions.Item label="操作" span={2}>
                          <Space>
                            <Button
                              size="small"
                              onClick={() => {
                                setViewOpen(false);
                                openEdit(viewVehicle, "insurance");
                              }}
                            >
                              编辑保险
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setViewOpen(false);
                                openEdit(viewVehicle, "annual");
                              }}
                            >
                              编辑年审
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setViewOpen(false);
                                openEdit(viewVehicle, "maint");
                              }}
                            >
                              编辑保养
                            </Button>
                          </Space>
                        </Descriptions.Item>
                      ) : null}
                    </Descriptions>
                  ),
                },
                {
                  key: "files",
                  label: "附件",
                  children: (
                    <Space direction="vertical" size={8}>
                      {viewCycle?.insuranceAttachmentKey ? (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            void viewAttachment(viewCycle.insuranceAttachmentKey!);
                          }}
                        >
                          查看保单附件
                        </a>
                      ) : (
                        <span>保单附件：-</span>
                      )}
                      {parseRemarkMeta(viewVehicle.remark).drivingLicenseAttachmentKey ? (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            void viewAttachment(parseRemarkMeta(viewVehicle.remark).drivingLicenseAttachmentKey);
                          }}
                        >
                          查看行驶证附件
                        </a>
                      ) : (
                        <span>行驶证附件：-</span>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          )
        ) : null}
      </Modal>

      {open ? (
        <div className="rounded-sm border border-slate-200 bg-white">
          <div className="sticky top-12 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
            <div className="text-sm font-medium text-slate-900">{editing ? "编辑车辆" : "新增车辆"}</div>
            <Space size={8}>
              <Button onClick={() => setOpen(false)}>取消</Button>
              <Button type="primary" onClick={() => void submit()}>
                保存
              </Button>
            </Space>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-4">
        <Form form={form} layout="vertical">
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
                      <Form.Item label="号牌号码">
                        <Controller
                          name="plateNo"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="在后缀继续输入，如 D12345；非豫A请改掉前缀" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="车辆类型">
                        <Controller
                          name="vehicleType"
                          control={control}
                          render={({ field }) => <Select {...field} options={vehicleTypeOptions} placeholder="请选择车辆类型" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="能源类型" name="energyType" rules={[{ required: true }]}>
                        <Controller
                          name="energyType"
                          control={control}
                          render={({ field }) => <Select {...field} allowClear options={energyTypeOptions} placeholder="请选择能源类型" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="使用性质" name="usageNature" rules={[{ required: true }]}>
                        <Controller
                          name="usageNature"
                          control={control}
                          render={({ field }) => <Select {...field} allowClear options={usageNatureOptions} placeholder="如：营运/非营运" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="品牌型号">
                        <Controller
                          name="brandModel"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="如：丰田凯美瑞" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="车辆识别代号">
                        <Controller
                          name="vin"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="17 位 VIN" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="发动机号">
                        <Controller
                          name="engineNo"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="请输入发动机号" />}
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
                      <Form.Item label="档案编号">
                        <Controller
                          name="archiveNo"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="请输入档案编号" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="核定载人数">
                        <Controller
                          name="loadPeople"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="如：5 人" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="核定载质量">
                        <Controller
                          name="loadWeight"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="如：3500kg" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="外廓尺寸">
                        <Controller
                          name="dimensions"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="长×宽×高" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="所有人">
                        <Controller
                          name="ownerName"
                          control={control}
                          render={({ field }) => (
                            <AutoComplete
                              className="w-full"
                              style={{ width: "100%" }}
                              options={ownerNameSelectOptions}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="请选择或输入所有人（系统配置中可维护对照表）"
                              filterOption={(inputValue, option) =>
                                (option?.value ?? "").toString().toLowerCase().includes(inputValue.trim().toLowerCase())
                              }
                              onSelect={(value) => {
                                field.onChange(value);
                                const addr = ownerDirectoryMap.get(value);
                                if (addr !== undefined) {
                                  setRhfValue("ownerAddress", addr);
                                  form.setFieldValue("ownerAddress", addr);
                                }
                              }}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="住址">
                        <Controller
                          name="ownerAddress"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="选择所有人后自动填入，也可手动修改" />}
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
                      <Form.Item label="下次保养里程">
                        <Controller
                          name="maintNextKm"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(Number(e.target.value))}
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
                      <Form.Item label="使用部门">
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
                      <Form.Item label="责任人">
                        <Controller
                          name="ownerPerson"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="请输入责任人" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="行驶证附件Key">
                        <Controller
                          name="drivingLicenseAttachmentKey"
                          control={control}
                          render={({ field }) => <Input {...field} placeholder="上传后自动填充，或可手动填写" />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="上传行驶证">
                        <R2AttachmentUploader
                          value={getRhfValues().drivingLicenseAttachmentKey}
                          onUploaded={(key) => {
                            setRhfValue("drivingLicenseAttachmentKey", key);
                            form.setFieldValue("drivingLicenseAttachmentKey", key);
                          }}
                          description="拖拽或点击上传行驶证扫描件（图片/PDF）"
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
                  </Row>
                ),
              },
              {
                key: "insurance",
                label: "保险信息",
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="保险类型" name="insuranceType" rules={[{ required: true }]}>
                        {renderTextInput("insuranceType", "如：交强险、商业险")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="保险公司" name="insuranceVendor" rules={[{ required: true }]}>
                        {renderTextInput("insuranceVendor", "请输入保险公司")}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="投保日期" name="insuranceStart" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="到期日期" name="insuranceExpiry" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="保单附件Key" name="insuranceAttachmentKey" rules={[{ required: true }]}>
                        <Input placeholder="上传后自动填充" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="上传保单">
                        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.insuranceAttachmentKey !== cur.insuranceAttachmentKey}>
                          {() => (
                            <R2AttachmentUploader
                              value={form.getFieldValue("insuranceAttachmentKey")}
                              onUploaded={(key) => form.setFieldValue("insuranceAttachmentKey", key)}
                              description="拖拽或点击上传保单附件"
                            />
                          )}
                        </Form.Item>
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "annual",
                label: "年审信息",
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="上次审车日期" name="annualLastDate" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="年审到期日" name="annualExpiry" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: "maint",
                label: "保养信息",
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="上次保养日期" name="maintLastDate" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="保养间隔天数" name="maintIntervalDays" rules={[{ required: true }]}>
                        <Input type="number" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="保养间隔里程" name="maintIntervalKm" rules={[{ required: true }]}>
                        <Input type="number" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="下次保养日期" name="maintNextDate" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Form>
          </div>
        </div>
      ) : null}
    </div>
    </PageContainer>
  );
}

