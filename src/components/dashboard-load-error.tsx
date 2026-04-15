import { PageContainer } from "@/components/page-container";

export function DashboardLoadError() {
  return (
    <PageContainer size="wide" className="py-8">
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-foreground shadow-sm">
        <p className="font-medium">数据暂时无法加载</p>
        <p className="mt-2 text-muted-foreground">请稍后重试。若问题持续，请联系系统管理员。</p>
      </div>
    </PageContainer>
  );
}
