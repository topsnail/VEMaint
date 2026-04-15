import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "../../env";

export function getCloudflareEnv(): CloudflareEnv {
  const ctx = getCloudflareContext();
  return ctx.env as CloudflareEnv;
}
