import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "../../env";
import { normalizeUsername } from "@/lib/auth-users";

type EnvWithBootstrap = CloudflareEnv & {
  BOOTSTRAP_ADMIN_PASSWORD?: string;
  BOOTSTRAP_ADMIN_USERNAME?: string;
};

/**
 * 用括号访问 process.env，减轻 Next/OpenNext 构建期把 `process.env.XXX` 内联成 undefined 的问题。
 * Cloudflare Pages 控制台里的变量在运行时往往出现在 Worker 的 `env`（见 getCloudflareContext().env）。
 */
function readProcessEnv(key: "BOOTSTRAP_ADMIN_PASSWORD" | "BOOTSTRAP_ADMIN_USERNAME"): string | undefined {
  const v = process.env[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * Cloudflare Pages / Workers：首次部署、KV 中尚无用户时，用此凭据登录一次即可写入首个超级管理员。
 * 一旦 KV 中已有用户，此配置会被忽略。
 */
export async function getBootstrapAdminConfig(): Promise<{ username: string; password: string } | null> {
  let password = readProcessEnv("BOOTSTRAP_ADMIN_PASSWORD")?.trim();
  let rawUsername = readProcessEnv("BOOTSTRAP_ADMIN_USERNAME");

  try {
    const ctx = await getCloudflareContext({ async: true });
    const e = ctx.env as EnvWithBootstrap;
    if (!password && typeof e.BOOTSTRAP_ADMIN_PASSWORD === "string") {
      password = e.BOOTSTRAP_ADMIN_PASSWORD.trim();
    }
    if (rawUsername === undefined && typeof e.BOOTSTRAP_ADMIN_USERNAME === "string") {
      rawUsername = e.BOOTSTRAP_ADMIN_USERNAME;
    }
  } catch {
    // 本地 next dev 或非 CF 运行时
  }

  if (!password) return null;
  const username = normalizeUsername(rawUsername ?? "admin");
  if (!username) return null;
  return { username, password };
}

/** 防止时序侧信道（用户名/密码均为短字符串时足够） */
export function constantTimeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i += 1) diff |= ba[i] ^ bb[i];
  return diff === 0;
}
