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
        <p className="mt-2 text-sm text-slate-500">
          存储于 Cloudflare KV 键 app:settings：维保类型、维保项目（含可选子分类）、车辆台账下拉（车辆类型/使用性质）、预警任务推荐与展示窗口。
        </p>
      </div>
      <SettingsForm initial={initial} />
    </div>
  );
}
