export function daysBetweenToday(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((t - now.getTime()) / 86400000);
}

export function alertLevel(days: number | null, threshold: number): "none" | "soon" | "expired" {
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= threshold) return "soon";
  return "none";
}

