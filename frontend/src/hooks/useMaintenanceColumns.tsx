import { Button, Popconfirm, Space, Tooltip } from "@/components/ui/legacy";
import type { FormInstance } from "@/components/ui/legacy";
import dayjs from "dayjs";
import { useMemo } from "react";
import { calcPartStats, parseRemarkMeta } from "../lib/maintenanceMeta";
import type { MaintenanceRecord } from "../types";
import { Pencil, Trash2 } from "lucide-react";

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
  equipmentLocation?: string;
  attachmentKey?: string | null;
};

type UseMaintenanceColumnsArgs = {
  canEdit: boolean;
  canDelete: boolean;
  form: FormInstance<FormModel>;
  itemDescOptions: Array<{ value: string; label: string }>;
  parsedRemarkMap: Map<string, ReturnType<typeof parseRemarkMeta>>;
  onEditOpen: (record: MaintenanceRecord) => void;
  onDelete: (id: string) => void;
  onViewAttachment: (attachmentKey: string) => void;
};

export function useMaintenanceColumns({
  canEdit,
  canDelete,
  form,
  itemDescOptions,
  parsedRemarkMap,
  onEditOpen,
  onDelete,
  onViewAttachment,
}: UseMaintenanceColumnsArgs) {
  return useMemo(
    () => [
      { title: "车牌号", dataIndex: "plateNo" },
      { title: "车辆", dataIndex: "brandModel" },
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
        render: (_: unknown, record: MaintenanceRecord) =>
          record.attachmentKey ? (
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onViewAttachment(record.attachmentKey!);
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
        render: (_: unknown, record: MaintenanceRecord) => (
          <Space size={6}>
            {canEdit ? (
              <Tooltip title="编辑">
                <Button
                  type="text"
                  size="small"
                  icon={<Pencil className="h-4 w-4" />}
                  className="ve-edit-btn"
                  onClick={() => {
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
                      equipmentLocation: parsed.equipmentLocation,
                      attachmentKey: record.attachmentKey || "",
                    });
                    onEditOpen(record);
                  }}
                />
              </Tooltip>
            ) : null}
            {canDelete ? (
              <Popconfirm title="确认删除该记录？" onConfirm={() => onDelete(record.id)}>
                <Tooltip title="删除">
                  <Button type="text" size="small" danger icon={<Trash2 className="h-4 w-4" />} className="ve-delete-btn" />
                </Tooltip>
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [canDelete, canEdit, form, itemDescOptions, onDelete, onEditOpen, onViewAttachment, parsedRemarkMap],
  );
}
