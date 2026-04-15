import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "../../env";

type EnvWithSecrets = CloudflareEnv & { AUTH_SECRET?: string };

/**
 * 会话与分享链接签名用密钥。须从 Worker env 与 process.env 两处尝试读取，
 * 避免 OpenNext/Next 构建期把 process.env 内联为空。
 */
export async function getAuthSecretAsync(): Promise<string> {
  let v = typeof process.env["AUTH_SECRET"] === "string" ? process.env["AUTH_SECRET"].trim() : "";
  if (!v) {
    try {
      const ctx = await getCloudflareContext({ async: true });
      const e = ctx.env as EnvWithSecrets;
      if (typeof e.AUTH_SECRET === "string") v = e.AUTH_SECRET.trim();
    } catch {
      // 本地 next dev 等
    }
  }
  if (process.env.NODE_ENV === "production" && !v) {
    throw new Error("Missing AUTH_SECRET in production.");
  }
  return v || "ve-maint-dev-secret-change-me";
}

let hmacKeyPromise: Promise<CryptoKey> | null = null;
let hmacKeyForSecret: string | null = null;

export async function importAuthHmacKey(): Promise<CryptoKey> {
  const secret = await getAuthSecretAsync();
  if (hmacKeyPromise && hmacKeyForSecret === secret) return hmacKeyPromise;
  hmacKeyForSecret = secret;
  hmacKeyPromise = crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return hmacKeyPromise;
}
