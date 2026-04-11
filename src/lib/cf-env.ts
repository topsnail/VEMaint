import { getRequestContext } from "@cloudflare/next-on-pages";
import type { CloudflareEnv } from "../../env";

export function getCloudflareEnv(): CloudflareEnv {
  const ctx = getRequestContext();
  return ctx.env as CloudflareEnv;
}
