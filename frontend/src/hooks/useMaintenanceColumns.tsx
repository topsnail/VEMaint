import { Button, Dropdown } from "@/components/ui/legacy";
import type { FormInstance } from "@/components/ui/legacy";
import dayjs from "dayjs";
import { useMemo } from "react";
import { calcPartStats, parseRemarkMeta } from "../lib/maintenanceMeta";
import type { MaintenanceRecord } from "../types";
import { MoreHorizontal } from "lucide-react";
import { AttachmentStatus } from "../components/AttachmentStatus";

type FormModel = {
  vehicleId?: string;
  targetType: "vehicle" | "equipment" | "other";
  equipmentName?: string;
  maintenanceType: "routine" | "fault" | "accident" | "periodic";
  maintenanceDate: string | dayjs.Dayjs;
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
  partDetails?: Array<{ partName?: string; spec?: string; unit?: string; qty?: number; unitPrice?: number }>;
  equipmentType?: string;
  equipmentCategory?: string;
  attachmentKey?: string | null;
  attachmentKeys?: string[];
};

type UseMaintenanceColumnsArgs = {
  view: "all" | "vehicle" | "equipment";
  canEdit: boolean;
  canDelete: boolean;
  form: FormInstance<FormModel>;
  itemDescOptions: Array<{ value: string; label: string }>;
  parsedRemarkMap: Map<string, ReturnType<typeof parseRemarkMeta>>;
  onViewOpen: (record: MaintenanceRecord) => void;
  onEditOpen: (record: MaintenanceRecord) => void;
  onDeleteRequest: (record: MaintenanceRecord) => void;
  onViewAttachment: (attachmentKeys: string[] | string) => void;
};

export function useMaintenanceColumns({
  view,
  canEdit,
  canDelete,
  form,
  itemDescOptions,
  parsedRemarkMap,
  onViewOpen,
  onEditOpen,
  onDeleteRequest,
  onViewAttachment,
}: UseMaintenanceColumnsArgs) {
  const normalizeAttachmentKeys = (keys: Array<string | null | undefined>) =>
    keys
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .filter((k, idx, arr) => arr.indexOf(k) === idx)
      .slice(0, 50);
  return useMemo(
    () => [
      ...(view === "equipment"
        ? [
            { title: "设备名称", dataIndex: "equipmentName" },
            {
              title: "设备类型",
              render: (_: unknown, record: MaintenanceRecord) => parsedRemarkMap.get(record.id)?.equipmentType || "-",
            },
            {
              title: "设备分类",
              render: (_: unknown, record: MaintenanceRecord) => parsedRemarkMap.get(record.id)?.equipmentCategory || "-",
            },
          ]
        : [
            { title: "车牌号", dataIndex: "plateNo" },
            { title: "车辆", dataIndex: "brandModel" },
          ]),
      { title: "维保日期", dataIndex: "maintenanceDate" },
      { title: "项目", dataIndex: "itemDesc" },
      { title: "费用", dataIndex: "cost" },
      {
        title: "配件种类",
        render: (_: unknown, record: MaintenanceRecord) => {
          const parsed = parsedRemarkMap.get(record.id);
          const partStats = calcPartStats(parsed?.partDetails);
          return partStats.count || "-";
        },
      },
      {
        title: "配件金额",
        render: (_: unknown, record: MaintenanceRecord) => {
          const parsed = parsedRemarkMap.get(record.id);
          const partStats = calcPartStats(parsed?.partDetails);
          return partStats.amount > 0 ? `¥${partStats.amount.toFixed(2)}` : "-";
        },
      },
      { title: "维修单位", dataIndex: "vendor" },
      {
        title: "附件",
        render: (_: unknown, record: MaintenanceRecord) => {
          const parsed = parsedRemarkMap.get(record.id);
          const keys = normalizeAttachmentKeys([
            ...(parsed?.attachmentKeys ?? []),
            record.attachmentKey,
          ]);
          const n = keys.length;
          return (
            <div className="flex items-center gap-2">
              <AttachmentStatus uploaded={n > 0} count={n} className="text-xs" />
              {n > 0 ? (
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onViewAttachment(keys as string[]);
                }}
                className="ve-link"
              >
                查看
              </a>
            ) : null}
          </div>
          );
        },
      },
      {
        title: "操作",
        render: (_: unknown, record: MaintenanceRecord) => (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "view", label: "查看" },
                ...(canEdit ? [{ key: "edit", label: "编辑" }] : []),
                ...(canDelete ? [{ type: "divider" } as const, { key: "delete", label: "删除", danger: true }] : []),
              ],
              onClick: ({ key }) => {
                if (key === "view") {
                  onViewOpen(record);
                }
                if (key === "edit") {
                  const parsed = parsedRemarkMap.get(record.id) ?? parseRemarkMeta(record.remark);
                  const isPresetItemDesc = itemDescOptions.some((option) => option.value === record.itemDesc);
                  form.setFieldsValue({
                    vehicleId: record.vehicleId ?? undefined,
                    targetType: record.targetType,
                    equipmentName: record.equipmentName || "",
                    maintenanceType: record.maintenanceType,
                    maintenanceDate: record.maintenanceDate ? dayjs(record.maintenanceDate) : undefined,
                    itemDesc: isPresetItemDesc ? record.itemDesc : "其他",
                    itemDescOther: isPresetItemDesc ? "" : record.itemDesc,
                    cost: record.cost,
                    vendor: record.vendor || "",
                    parts: record.parts || "",
                    mileage: record.mileage ?? undefined,
                    remark: parsed.remark,
                    laborCost: parsed.laborCost,
                    materialCost: parsed.materialCost,
                    miscCost: parsed.miscCost,
                    resultStatus: parsed.resultStatus,
                    partDetails: parsed.partDetails,
                    equipmentType: parsed.equipmentType,
                    equipmentCategory: parsed.equipmentCategory,
                    attachmentKeys: normalizeAttachmentKeys([
                      ...parsed.attachmentKeys,
                      record.attachmentKey,
                    ]),
                    attachmentKey: normalizeAttachmentKeys([
                      ...parsed.attachmentKeys,
                      record.attachmentKey,
                    ])[0] || "",
                  });
                  onEditOpen(record);
                }
                if (key === "delete") {
                  onDeleteRequest(record);
                }
              },
            }}
          >
            <Button type="text" icon={<MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />} />
          </Dropdown>
        ),
      },
    ],
    [canDelete, canEdit, form, itemDescOptions, onDeleteRequest, onEditOpen, onViewAttachment, onViewOpen, parsedRemarkMap, view],
  );
}
