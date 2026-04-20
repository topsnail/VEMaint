type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneMap: Record<Tone, { text: string; bg: string }> = {
  neutral: {
    text: "text-slate-600",
    bg: "bg-slate-100",
  },
  info: {
    text: "text-blue-600",
    bg: "bg-blue-50",
  },
  success: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  warning: {
    text: "text-orange-700",
    bg: "bg-orange-50",
  },
  danger: {
    text: "text-orange-700",
    bg: "bg-orange-50",
  },
};

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const t = toneMap[tone];
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium leading-snug ${t.bg} ${t.text}`}>
      {label}
    </span>
  );
}
