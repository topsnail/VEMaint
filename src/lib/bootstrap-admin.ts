import { normalizeUsername } from "@/lib/auth-users";

/**
 * Cloudflare Pages / Workers 环境变量：首次部署、KV 中尚无用户时，用此凭据登录一次即可写入首个超级管理员。
 * 一旦 KV 中已有用户，此配置会被忽略（避免环境变量成为永久后门）。
 *
 * - BOOTSTRAP_ADMIN_PASSWORD：必填（若要走云端初始化）
 * - BOOTSTRAP_ADMIN_USERNAME：可选，默认 admin
 */
export function getBootstrapAdminConfig(): { username: string; password: string } | null {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
  if (!password) return null;
  const username = normalizeUsername(process.env.BOOTSTRAP_ADMIN_USERNAME ?? "admin");
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
