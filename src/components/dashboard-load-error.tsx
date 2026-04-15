import { PageContainer } from "@/components/page-container";

export function DashboardLoadError() {
  return (
    <PageContainer size="wide" className="py-8">
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-foreground shadow-sm">
        <p className="font-medium">数据暂时无法加载</p>
        <p className="mt-2 text-muted-foreground">
          请确认 Cloudflare Pages 项目中已为该应用绑定 D1（名称 <code className="rounded bg-muted px-1">DB</code>）、KV（
          <code className="rounded bg-muted px-1">KV</code>）与 R2（<code className="rounded bg-muted px-1">R2</code>
          ），并已执行远程数据库迁移；同时检查环境变量{" "}
          <code className="rounded bg-muted px-1">AUTH_SECRET</code> 是否已配置。
        </p>
      </div>
    </PageContainer>
  );
}
