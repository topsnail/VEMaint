import { SettingsForm } from "@/components/settings-form";
import { PageContainer } from "@/components/page-container";
import { loadAppSettings } from "@/lib/app-settings";
import { getCloudflareEnv } from "@/lib/cf-env";
export const runtime = "edge";

export default async function SettingsPage() {
  const env = getCloudflareEnv();
  const initial = await loadAppSettings(env.KV);

  return (
    <PageContainer size="standard" className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">应用配置</h1>
      </div>
      <SettingsForm initial={initial} />
    </PageContainer>
  );
}
