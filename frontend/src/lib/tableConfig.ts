import type { TableProps } from "antd";

/** 顶栏高度（52px），避免 sticky 表头与固定顶栏重叠 */
export const TABLE_STICKY_OFFSET_HEADER = 52;

/** 列表页：1080p 下预留 PageContainer、筛选区、分页等后的可视高度 */
export const listTableScroll: NonNullable<TableProps<unknown>["scroll"]> = {
  x: "max-content",
  y: "calc(100vh - 320px)",
};

export const listTableSticky: NonNullable<TableProps<unknown>["sticky"]> = {
  offsetHeader: TABLE_STICKY_OFFSET_HEADER,
};

/** 卡片内嵌表格（仪表盘等）：适中高度，避免短数据撑满一屏 */
export const cardTableScroll: NonNullable<TableProps<unknown>["scroll"]> = {
  x: "max-content",
  y: "min(420px, calc(100vh - 380px))",
};

export const cardTableSticky: NonNullable<TableProps<unknown>["sticky"]> = {
  offsetHeader: TABLE_STICKY_OFFSET_HEADER,
};
