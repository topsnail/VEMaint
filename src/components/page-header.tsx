import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={["flex flex-wrap items-end justify-between gap-2 md:gap-3", className].filter(Boolean).join(" ")}>
      <div className="flex min-w-0 flex-wrap items-end gap-2 md:gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</h1>
        {subtitle ? <p className="text-xs text-slate-500 md:text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-end gap-2">{actions}</div> : null}
    </header>
  );
}

