/** YYYY-MM-DD */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type AlertUrgencyLevel = "red" | "yellow" | "blue" | "normal";

/** 到期日相对「今天」的展示文案（与 dashboard / 设备详情共用） */
export function dueRelativeLabel(dueDate: string, todayIso: string): string {
  if (!dueDate || !ISO_DATE.test(dueDate)) return "—";
  const today = new Date(`${todayIso}T00:00:00`).getTime();
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  if (Number.isNaN(today) || Number.isNaN(due)) return "—";
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "今日到期";
  return `${days} 天后`;
}

/** 「剩余」列文字色，与 alertLevel 结果对齐 */
export function relativeDueToneClass(level: AlertUrgencyLevel): string {
  if (level === "red") return "font-medium text-rose-700";
  if (level === "yellow") return "text-amber-800";
  return "text-slate-600";
}
