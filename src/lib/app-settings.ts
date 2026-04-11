import { KV_APP_SETTINGS_KEY, type AppSettings, parseAppSettings } from "@/lib/kv-settings";

export async function loadAppSettings(kv: KVNamespace): Promise<AppSettings> {
  const raw = await kv.get(KV_APP_SETTINGS_KEY, "text");
  return parseAppSettings(raw);
}
