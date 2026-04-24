import type { ReactNode } from "react";

export type PageBreadcrumbItem = { title: string; path?: string };

export function PageContainer(props: {
  title: ReactNode;
  breadcrumb?: PageBreadcrumbItem[];
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { title, breadcrumb, extra, children, className = "" } = props;
  void breadcrumb;

  return (
    <div className={`p-4 md:p-5 ${className}`.trim()}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-base font-semibold tracking-tight text-slate-900 md:text-lg">{title}</div>
        {extra ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">{extra}</div> : null}
      </div>
      {children}
    </div>
  );
}
