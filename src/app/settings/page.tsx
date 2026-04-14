import { SettingsForm } from "@/components/settings-form";
import { loadAppSettings } from "@/lib/app-settings";
import { getCloudflareEnv } from "@/lib/cf-env";
export const runtime = "edge";

export default async function SettingsPage() {
  const env = getCloudflareEnv();
  const initial = await loadAppSettings(env.KV);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">应用配置</h1>
      </div>
      <SettingsForm initial={initial} />
    </div>
  );
}
