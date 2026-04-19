import { Layout } from "antd";
import type { ReactNode } from "react";
import { useRef } from "react";
import { useEnterMotion } from "../lib/useEnterMotion";

export function DashboardLayout(props: {
  headerLeft: ReactNode;
  headerCenter?: ReactNode;
  headerRight: ReactNode;
  sider: ReactNode;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEnterMotion(contentRef, []);

  return (
    <Layout className="min-h-screen bg-[#F5F7FA] text-[#1F2937]">
      <Layout.Header className="sticky top-0 z-30 !h-16 !leading-none !px-4">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 rounded-b-lg border border-[#E5E7EB] bg-white px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">{props.headerLeft}</div>
          </div>
          {props.headerCenter ? <div className="min-w-0 flex-1">{props.headerCenter}</div> : <div className="flex-1" />}
          <div className="flex items-center justify-end">{props.headerRight}</div>
        </div>
      </Layout.Header>

      <Layout className="!bg-transparent">
        <Layout.Sider width={280} className="!bg-transparent" breakpoint="lg" collapsedWidth={0}>
          <div className="sticky top-20 px-4">
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">{props.sider}</div>
          </div>
        </Layout.Sider>

        <Layout.Content className="!bg-transparent">
          <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
            <div ref={contentRef} className="rounded-lg border border-[#E5E7EB] bg-white p-6">
              {props.children}
            </div>
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

