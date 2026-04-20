import { Button, Drawer, Layout } from "@/components/ui/legacy";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEnterMotion } from "../lib/useEnterMotion";
import { Menu } from "lucide-react";

export type MobileDockItem = { key: string; icon: ReactNode; label: string };

export function DashboardLayout(props: {
  headerLeft: ReactNode;
  headerCenter?: ReactNode;
  headerRight: ReactNode;
  sider: ReactNode;
  mobileDockItems?: MobileDockItem[];
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEnterMotion(contentRef, []);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.clientWidth < 992;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => setIsMobile(document.documentElement.clientWidth < 992);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const dockItems = props.mobileDockItems ?? [];

  const shellClass = "mx-auto w-full max-w-[1440px] px-4";

  return (
    <Layout className="min-h-screen bg-page text-[#1F2937]">
      <div className="w-full">
        <Layout.Header className="sticky top-0 z-30 !m-0 !h-12 !w-full !max-w-none !bg-transparent !p-0 !leading-none">
          <div className="flex h-12 w-full items-center gap-2 overflow-hidden border-b border-slate-200 bg-white md:gap-3">
            {isMobile ? (
              <Button type="text" icon={<Menu className="h-4 w-4" strokeWidth={1.5} />} onClick={() => setDrawerOpen(true)} aria-label="打开导航" className="!shrink-0" />
            ) : null}
            <div className="flex min-w-0 shrink items-center gap-3">{props.headerLeft}</div>
            {props.headerCenter ? (
              <div className="mx-4 flex min-w-0 flex-1">{props.headerCenter}</div>
            ) : (
              <div className="flex-1" />
            )}
            <div className="ml-auto flex shrink-0 items-center">{props.headerRight}</div>
          </div>
        </Layout.Header>

        <div className={shellClass}>
          {isMobile ? (
            <Layout className="!min-h-[calc(100vh-3rem)] !w-full !bg-transparent">
              <Layout.Content className="!bg-transparent pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
                <div className="min-h-[calc(100vh-7rem)] w-full py-4">
                  <div ref={contentRef} className="border border-slate-200 bg-white">
                    {props.children}
                  </div>
                </div>
              </Layout.Content>
            </Layout>
          ) : (
            <div className="flex min-h-[calc(100vh-3rem)] w-full items-start gap-0 py-4">
              <aside className="w-52 shrink-0">
                <div className="sticky top-[3.75rem]">
                  <div className="border-r border-slate-200 bg-slate-50 p-2.5">{props.sider}</div>
                </div>
              </aside>
              <div className="min-w-0 flex-1">
                <div ref={contentRef} className="border border-slate-200 bg-white p-4">
                  {props.children}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer
        title="导航与快捷操作"
        placement="left"
        width={280}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { paddingTop: 8, paddingInline: 16, paddingBottom: 16 } }}
      >
        {props.sider}
      </Drawer>

      {dockItems.length > 0 && isMobile ? (
        <nav
          className="ve-mobile-dock fixed bottom-0 left-0 right-0 z-40 flex border-t border-[#E5E7EB] bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-sm lg:hidden"
          aria-label="主导航"
        >
          {dockItems.map((item) => {
            const active = location.pathname === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] leading-tight transition-colors ${
                  active ? "text-primary" : "text-[#64748B] hover:text-[#334155]"
                }`}
              >
                <span className="text-lg leading-none [&_.anticon]:text-[18px]">{item.icon}</span>
                <span className="w-full truncate px-0.5 text-center">{item.label}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
    </Layout>
  );
}
