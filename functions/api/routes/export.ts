import { Hono } from "hono";
import * as XLSX from "xlsx";
import { d1All } from "../db/d1";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import type { AppEnv } from "../types";

export const exportRoute = new Hono<AppEnv>();
exportRoute.use("/api/export/*", requireAuth);

const COMMON_HEADER_LABELS: Record<string, string> = {
  id: "ID",
  vehicle_id: "车辆ID",
  maintenance_id: "维保ID",
  plate_no: "车牌号",
  brand_model: "品牌型号",
  status: "状态",
  target_type: "关联类型",
  vehicle_type: "车辆类型",
  energy_type: "能源类型",
  usage_nature: "使用性质",
  owner_dept: "使用部门",
  owner_person: "使用人",
  equipment_name: "设备名称",
  equipment_type: "设备类型",
  equipment_category: "设备分类",
  maintenance_date: "维保日期",
  maintenance_type: "维保类型",
  item_desc: "维保项目",
  vendor: "服务商",
  result_status: "结果状态",
  mileage: "当前里程",
  cost: "费用",
  remark: "备注",
  created_at: "创建时间",
  updated_at: "更新时间",
};

function normalizeHeaders(rows: Array<Record<string, unknown>>, preferredOrder: string[]) {
  const rowKeys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );
  const preferred = preferredOrder.filter((k) => rowKeys.includes(k));
  const others = rowKeys.filter((k) => !preferred.includes(k));
  return [...preferred, ...others];
}

function labelFor(header: string, labels?: Record<string, string>) {
  return labels?.[header] ?? COMMON_HEADER_LABELS[header] ?? header;
}

function localizeValue(header: string, value: unknown): string | number | boolean {
  if (value == null) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "是" : "否";
  const text = String(value);
  if (text === "") return "";

  if (header === "target_type") {
    if (text === "vehicle") return "车辆";
    if (text === "equipment") return "设备";
    if (text === "other") return "其他";
  }
  if (header === "status") {
    if (text === "normal") return "正常";
    if (text === "repairing") return "维修中";
    if (text === "stopped") return "停用";
    if (text === "scrapped") return "报废";
  }
  if (header === "maintenance_type") {
    if (text === "routine") return "日常保养";
    if (text === "fault") return "故障维修";
    if (text === "accident") return "事故维修";
    if (text === "periodic") return "定期检修";
  }
  if (header === "result_status") {
    if (text === "resolved") return "已修复";
    if (text === "temporary") return "临时处理";
    if (text === "pending") return "待复查";
  }
  return text;
}

function xlsxResponse(
  filename: string,
  sheetName: string,
  rows: Array<Record<string, unknown>>,
  preferredOrder: string[],
  labels?: Record<string, string>,
) {
  const columns = normalizeHeaders(rows, preferredOrder);
  const dataRows = rows.map((row) => columns.map((h) => localizeValue(h, row[h])));
  const aoa: Array<Array<string | number | boolean>> = [columns.map((h) => labelFor(h, labels)), ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(0, aoa.length - 1), c: Math.max(0, columns.length - 1) },
    }),
  };
  ws["!cols"] = columns.map((h, i) => {
    const headerLen = String(labelFor(h, labels)).length;
    const maxCell = dataRows.reduce((m, row) => Math.max(m, String(row[i] ?? "").length), 0);
    return { wch: Math.min(42, Math.max(10, Math.max(headerLen, maxCell) + 2)) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const file = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const headers = new Headers();
  headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "no-store");
  return new Response(file, { status: 200, headers });
}

exportRoute.get("/api/export/vehicles", permitPerm("export.vehicles"), async (c) => {
  const rows = await d1All<Record<string, unknown>>(c.env.DB, "select * from vehicles order by updated_at desc");
  return xlsxResponse(
    `车辆台账-${new Date().toISOString().slice(0, 10)}.xlsx`,
    "车辆台账",
    rows,
    [
      "plate_no",
      "brand_model",
      "status",
      "vehicle_type",
      "energy_type",
      "usage_nature",
      "owner_dept",
      "owner_person",
      "mileage",
      "updated_at",
      "created_at",
    ],
    {
      plate_no: "车牌号",
      brand_model: "品牌型号",
      status: "状态",
      vehicle_type: "车辆类型",
      energy_type: "能源类型",
      usage_nature: "使用性质",
      owner_dept: "使用部门",
      owner_person: "使用人",
      mileage: "当前里程",
      updated_at: "更新时间",
      created_at: "创建时间",
    },
  );
});

exportRoute.get("/api/export/maintenance", permitPerm("export.maintenance"), async (c) => {
  const rows = await d1All<Record<string, unknown>>(
    c.env.DB,
    "select * from maintenance_records order by maintenance_date desc, updated_at desc",
  );
  return xlsxResponse(
    `维保记录-${new Date().toISOString().slice(0, 10)}.xlsx`,
    "维保记录",
    rows,
    [
      "maintenance_date",
      "target_type",
      "plate_no",
      "equipment_name",
      "maintenance_type",
      "item_desc",
      "cost",
      "vendor",
      "result_status",
      "updated_at",
      "created_at",
    ],
    {
      maintenance_date: "维保日期",
      target_type: "关联类型",
      plate_no: "车牌号",
      equipment_name: "设备名称",
      maintenance_type: "维保类型",
      item_desc: "维保项目",
      cost: "费用",
      vendor: "服务商",
      result_status: "结果状态",
      updated_at: "更新时间",
      created_at: "创建时间",
    },
  );
});

