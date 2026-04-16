export function daysBetweenToday(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((t - now.getTime()) / 86400000);
}

export function alertLevel(days: number | null, threshold: number): "none" | "within30" | "within7" | "expired" {
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= Math.min(threshold, 7)) return "within7";
  if (days <= 30) return "within30";
  return "none";
}

