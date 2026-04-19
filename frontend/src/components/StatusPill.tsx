type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneMap: Record<Tone, { dot: string; border: string; text: string; bg: string }> = {
  neutral: { dot: "bg-slate-400", border: "border-slate-200", text: "text-slate-700", bg: "bg-transparent" },
  info: { dot: "bg-blue-500", border: "border-blue-200", text: "text-blue-700", bg: "bg-transparent" },
  success: { dot: "bg-emerald-500", border: "border-emerald-200", text: "text-emerald-700", bg: "bg-transparent" },
  warning: { dot: "bg-amber-500", border: "border-amber-200", text: "text-amber-700", bg: "bg-transparent" },
  danger: { dot: "bg-rose-500", border: "border-rose-200", text: "text-rose-700", bg: "bg-transparent" },
};

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const t = toneMap[tone];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${t.border} ${t.bg} ${t.text}`}>
      <span className={`h-2 w-2 rounded-full ${t.dot}`} />
      <span className="text-[13px] leading-none">{label}</span>
    </span>
  );
}

