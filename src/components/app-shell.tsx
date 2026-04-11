"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BellPlus,
  BookOpen,
  CarFront,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type AppShellSearchAsset = { id: string; name: string; identifier: string };
export type AppShellSearchRecord = {
  id: string;
  assetId: string;
  type: string;
  date: string;
  description: string | null;
  project: string | null;
  projectChild: string | null;
};

type AppShellProps = {
  searchAssets: AppShellSearchAsset[];
  searchRecords: AppShellSearchRecord[];
  pendingReminderCount: number;
  children: React.ReactNode;
};

const SIDEBAR_W = "w-56";

const ALERTS_HREF = "/alerts";
/** 与侧栏其它项同为 4 字，便于对齐 */
const ALERTS_LABEL = "预警统计";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
  /** 侧栏「快捷新建」：略强调，与列表类区分 */
  variant?: "default" | "create";
  /** 与顶栏铃铛一致，展示待处理预警数 */
  showReminderBadge?: boolean;
};

type NavSection = { id: string; title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    id: "overview",
    title: "概览",
    items: [{ href: "/", label: "仪表盘", icon: LayoutDashboard, match: (p) => p === "/" }],
  },
  {
    id: "quick",
    title: "快捷新建",
    items: [
      {
        href: "/devices/new",
        label: "新增设备",
        icon: CarFront,
        match: (p) => p === "/devices/new",
        variant: "create",
      },
      {
        href: "/reminders/new",
        label: "新增预警",
        icon: BellPlus,
        match: (p) => p === "/reminders/new",
        variant: "create",
      },
    ],
  },
  {
    id: "ops",
    title: "设备维保",
    items: [
      {
        href: "/devices",
        label: "设备记录",
        icon: Wrench,
        match: (p) => p === "/devices" || (p.startsWith("/devices/") && !p.startsWith("/devices/new")),
      },
      { href: "/records", label: "维保记录", icon: ClipboardList, match: (p) => p === "/records" },
    ],
  },
  {
    id: "data",
    title: "数据系统",
    items: [
      {
        href: "/vehicle-ledger",
        label: "车辆台账",
        icon: BookOpen,
        match: (p) => p.startsWith("/vehicle-ledger"),
      },
      {
        href: ALERTS_HREF,
        label: ALERTS_LABEL,
        icon: Bell,
        match: (p) => p === "/alerts",
        showReminderBadge: true,
      },
      { href: "/settings", label: "系统设置", icon: Settings, match: (p) => p === "/settings" },
    ],
  },
];

function ReminderCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-medium tabular-nums text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SidebarNav({
  onNavigate,
  pendingReminderCount,
}: {
  onNavigate?: () => void;
  pendingReminderCount: number;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="主导航">
      {navSections.map((section, si) => (
        <div key={section.id}>
          {si > 0 ? <div className="my-2 border-t border-slate-200/70" role="presentation" /> : null}
          <p className="px-3 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {section.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map(
              ({ href, label, icon: Icon, match, variant = "default", showReminderBadge }) => {
                const active = match(pathname);
                const isCreate = variant === "create";
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                      isCreate && !active && "border border-emerald-200/45 bg-emerald-50/35 text-slate-800 hover:border-emerald-200/70 hover:bg-emerald-50/55",
                      isCreate && active && "border border-emerald-200/60 bg-white/85 font-medium text-slate-900 shadow-sm backdrop-blur-md",
                      !isCreate && !active && "text-slate-600 hover:bg-white/50 hover:text-slate-900",
                      !isCreate &&
                        active &&
                        "border border-slate-200/80 bg-white/80 font-medium text-slate-900 shadow-sm backdrop-blur-md",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    <span className="inline-block w-[4em] shrink-0 whitespace-nowrap text-left leading-tight">
                      {label}
                    </span>
                    {showReminderBadge ? <ReminderCountBadge count={pendingReminderCount} /> : null}
                  </Link>
                );
              },
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ searchAssets, searchRecords, pendingReminderCount, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const qDef = useDeferredValue(q);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const qq = qDef.trim().toLowerCase();
    if (!qq) return [];
    const assetHits = searchAssets
      .filter((a) => `${a.name} ${a.identifier}`.toLowerCase().includes(qq))
      .slice(0, 6)
      .map((a) => ({
        key: `a-${a.id}`,
        text: `设备：${a.name} · ${a.identifier}`,
        href: `/devices/${a.id}?entry=maintenance`,
      }));
    const recordHits = searchRecords
      .filter((r) =>
        `${r.type} ${r.description ?? ""} ${r.project ?? ""} ${r.projectChild ?? ""}`.toLowerCase().includes(qq),
      )
      .slice(0, 6)
      .map((r) => ({
        key: `r-${r.id}`,
        text: `维保：${r.type} · ${r.date}`,
        href: `/devices/${r.assetId}?entry=maintenance`,
      }));
    return [...assetHits, ...recordHits].slice(0, 10);
  }, [qDef, searchAssets, searchRecords]);

  useEffect(() => {
    setSearchOpen(q.trim().length > 0 && results.length > 0);
  }, [q, results.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleLogout() {
    setUserOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-full w-full max-w-[1920px] items-center gap-3 px-3 sm:px-4">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="inset-y-0 left-0 right-auto h-full w-[min(100%,280px)] max-w-xs border-l-0 border-r border-slate-200/80 p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-xs">
              <SheetHeader className="border-b border-slate-200/80 px-4 py-3 text-left">
                <SheetTitle className="text-base font-semibold">导航</SheetTitle>
              </SheetHeader>
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} pendingReminderCount={pendingReminderCount} />
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg pr-2 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-sm font-bold text-white shadow-sm">
              V
            </span>
            <span className="hidden font-semibold tracking-tight sm:inline">VEMaint</span>
          </Link>

          <div ref={searchRef} className="mx-auto min-w-0 max-w-xl flex-1 md:mx-auto">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => q.trim() && results.length > 0 && setSearchOpen(true)}
                placeholder="搜索车牌、设备、维保记录…"
                className="h-9 border-slate-200/90 bg-white/90 pl-9 pr-3 text-sm shadow-sm backdrop-blur-md"
                aria-label="全局搜索"
              />
              {searchOpen && results.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-slate-200/80 bg-white/95 py-1 shadow-lg backdrop-blur-xl">
                  {results.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setQ("");
                        setSearchOpen(false);
                        router.push(it.href);
                      }}
                    >
                      {it.text}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative md:hidden">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => q.trim() && results.length > 0 && setSearchOpen(true)}
                placeholder="搜索…"
                className="h-9 w-full min-w-[120px] max-w-[200px] border-slate-200/90 bg-white/90 pl-8 text-xs"
                aria-label="全局搜索"
              />
              {searchOpen && results.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-xl border border-slate-200/80 bg-white py-1 shadow-xl">
                  {results.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      className="block w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setQ("");
                        setSearchOpen(false);
                        router.push(it.href);
                      }}
                    >
                      {it.text}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">

            <Button variant="ghost" size="icon" className="relative text-slate-600" asChild>
              <Link href={ALERTS_HREF} aria-label={ALERTS_LABEL} title={ALERTS_LABEL}>
                <Bell className="h-5 w-5" />
                {pendingReminderCount > 0 ? (
                  <span className="pointer-events-none absolute right-1 top-1">
                    <ReminderCountBadge count={pendingReminderCount} />
                  </span>
                ) : null}
              </Link>
            </Button>

            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5 px-2 text-slate-700"
                onClick={() => setUserOpen((v) => !v)}
                aria-expanded={userOpen}
                aria-haspopup="true"
              >
                <UserRound className="h-5 w-5 shrink-0" />
                <span className="hidden text-sm sm:inline">用户</span>
              </Button>
              {userOpen ? (
                <>
                  <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="关闭菜单" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-200/80 bg-white/95 py-1 shadow-lg backdrop-blur-xl">
                    <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">本地部署 · 无账号体系</p>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      退出到首页
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-30 hidden overflow-y-auto border-r border-slate-200/70 bg-white/50 backdrop-blur-xl md:block",
          SIDEBAR_W,
        )}
      >
        <SidebarNav pendingReminderCount={pendingReminderCount} />
      </aside>

      <main
        className={cn(
          "min-h-[calc(100vh-3.5rem)] pt-14 transition-[padding] md:pl-56",
        )}
      >
        <div className="mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
