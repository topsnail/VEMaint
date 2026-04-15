import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "../../env";

/** OpenNext 在部分场景下要求使用 async 模式，避免构建/运行时 sync 调用报错 */
export async function getCloudflareEnv(): Promise<CloudflareEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as CloudflareEnv;
}
