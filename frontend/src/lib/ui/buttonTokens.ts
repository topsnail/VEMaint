export const actionBtn = {
  // Strong primary action in dialogs/pages, e.g. Save/Create.
  primary: "h-8 rounded-md border border-transparent bg-[var(--ve-btn-primary-bg)] px-3 text-white shadow-sm hover:bg-[var(--ve-btn-primary-bg-hover)]",
  // Secondary but emphasized action, same brand color family.
  secondary: "h-8 rounded-md border bg-[var(--ve-btn-secondary-bg)] px-3 text-[var(--ve-btn-primary-bg)] hover:bg-blue-100 border-[var(--ve-btn-secondary-border)]",
  // Lightweight utility action, used for view/helper operations.
  ghost: "h-8 rounded-md border border-slate-200 bg-transparent px-3 text-[var(--ve-btn-ghost-text)] hover:bg-slate-50 hover:text-slate-800",
  // Neutral cancel/back action.
  neutral: "h-8 rounded-md border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50",
  // Small neutral action in dense toolbars.
  smallNeutral: "h-7 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-50",
  // Small positive action such as enable/recover.
  smallSuccess: "h-7 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs text-emerald-700 hover:bg-emerald-100",
  // Small destructive action such as disable.
  smallDanger: "h-7 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-xs text-rose-700 hover:bg-rose-100",
  // Text icon button for neutral table row operations.
  textNeutral: "h-7 rounded-md px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800",
  // Text icon button for destructive table row operations.
  textDanger: "h-7 rounded-md px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700",
  // Link-like action used in export/log/tool sections.
  link: "h-7 rounded-md px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700",
} as const;

