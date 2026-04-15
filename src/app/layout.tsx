import type { Metadata } from "next";
import { connection } from "next/server";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { EMPTY_APP_SHELL_PAYLOAD, loadAppShellPayload } from "@/lib/load-dashboard-props";
import { getCurrentAuthSession } from "@/lib/auth-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "车辆与设备维保管理 | VEMaint",
  description: "车辆与设备维保管理（VEMaint）",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const isDev = process.env.NODE_ENV === "development";
  const pathname = (await headers()).get("x-pathname") ?? "";
  const skipShellData = pathname === "/login" || pathname.startsWith("/share/");

  const shellPromise = skipShellData
    ? Promise.resolve(EMPTY_APP_SHELL_PAYLOAD)
    : loadAppShellPayload().catch((err) => {
        console.error("[layout] loadAppShellPayload 失败（请检查 D1/KV 绑定与迁移）", err);
        return EMPTY_APP_SHELL_PAYLOAD;
      });

  const [shell, session] = await Promise.all([shellPromise, getCurrentAuthSession()]);

  return (
    <html lang="zh-CN" className="light">
      <body className="min-h-screen antialiased">
        {isDev ? (
          <div
            className="pointer-events-none fixed bottom-3 right-3 z-[100] select-none rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-primary shadow-sm"
            title="当前为 Next.js development + next-on-pages 本地模拟（wrangler.toml 绑定）"
          >
            本地测试
          </div>
        ) : null}
        <AppShell
          searchAssets={shell.searchAssets}
          searchRecords={shell.searchRecords}
          pendingReminderCount={shell.pendingReminderCount}
          currentUser={session ? { username: session.username, role: session.role } : null}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
