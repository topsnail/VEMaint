import { Breadcrumb, Typography } from "antd";
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
    <div className={`p-4 md:p-6 ${className}`.trim()}>
      {breadcrumb?.length ? (
        <Breadcrumb
          className="mb-3"
          items={breadcrumb.map((item) => ({
            title: item.path ? <Link to={item.path}>{item.title}</Link> : item.title,
          }))}
        />
      ) : null}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Typography.Title level={4} className="!mb-0 !text-base md:!text-lg">
          {title}
        </Typography.Title>
        {extra ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">{extra}</div> : null}
      </div>
      {children}
    </div>
  );
}
