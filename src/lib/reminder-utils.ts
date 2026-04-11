export type ReminderLite = { dueDate: string; taskType: string; id: string };

export function nearestReminderForAsset(assetId: string, remindersByAsset: Map<string, ReminderLite[]>) {
  const list = remindersByAsset.get(assetId);
  if (!list?.length) return null;
  return list[0];
}

/** 0–100：越接近到期进度越高（假定窗口 30 天） */
export function urgencyPercent(dueDateIso: string, windowDays = 30) {
  const due = new Date(dueDateIso).getTime();
  if (Number.isNaN(due)) return 0;
  const now = Date.now();
  const end = due;
  const start = end - windowDays * 86400000;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}
