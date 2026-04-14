/**
 * 数据表斑马纹行。
 * 注意：类名字符串需被 Tailwind content 扫描到（已包含 ./src/lib）。
 */
export function zebraTableRowClass(index: number): string {
  return (
    (index % 2 === 0 ? "bg-card " : "bg-sky-50/80 ") +
    "border-b border-border hover:bg-muted data-[state=selected]:bg-muted"
  );
}

/** 台账/列表外层卡片面板（不透明） */
export const glassPanelClass =
  "rounded-xl border border-border bg-card shadow-sm";
