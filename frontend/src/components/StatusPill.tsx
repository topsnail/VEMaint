type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** 半透明底 + 6px 圆角，与全局设计令牌一致 */
const toneMap: Record<Tone, { dot: string; border: string; text: string; bg: string }> = {
  neutral: {
    dot: "bg-slate-500",
    border: "border-slate-200/80",
    text: "text-slate-700",
    bg: "bg-slate-500/10",
  },
  info: {
    dot: "bg-[#1677ff]",
    border: "border-[#1677ff]/25",
    text: "text-[#0958d9]",
    bg: "bg-[#1677ff]/12",
  },
  success: {
    dot: "bg-emerald-600",
    border: "border-emerald-500/25",
    text: "text-emerald-800",
    bg: "bg-emerald-500/12",
  },
  warning: {
    dot: "bg-amber-500",
    border: "border-amber-500/25",
    text: "text-amber-900",
    bg: "bg-amber-400/15",
  },
  danger: {
    dot: "bg-rose-600",
    border: "border-rose-500/25",
    text: "text-rose-800",
    bg: "bg-rose-500/12",
  },
};

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const t = toneMap[tone];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-main border px-2.5 py-0.5 ${t.border} ${t.bg} ${t.text}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
      <span className="text-[13px] leading-snug">{label}</span>
    </span>
  );
}
