import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type PageBreadcrumbItem = { title: string; path?: string };

export function PageContainer(props: {
  title: ReactNode;
  breadcrumb?: PageBreadcrumbItem[];
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { title, breadcrumb, extra, children, className = "" } = props;

  return (
    <div className={`p-4 md:p-5 ${className}`.trim()}>
      {breadcrumb?.length ? (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {breadcrumb.map((item, idx) => (
            <span key={`${item.title}-${idx}`} className="inline-flex items-center gap-1">
              {idx > 0 ? <span className="text-slate-300">/</span> : null}
              {item.path ? (
                <Link to={item.path} className="hover:text-slate-700">
                  {item.title}
                </Link>
              ) : (
                <span>{item.title}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-base font-semibold text-slate-900 md:text-lg">{title}</div>
        {extra ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">{extra}</div> : null}
      </div>
      {children}
    </div>
  );
}
