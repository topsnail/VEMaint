import { SignJWT, jwtVerify } from "jose";
import type { CloudflareEnv } from "../../../env";
import type { JwtUser, UserRole } from "../types";

const TTL_SEC = 7 * 24 * 60 * 60;

function requireSecret(env: CloudflareEnv): string {
  const s = typeof env.AUTH_SECRET === "string" ? env.AUTH_SECRET.trim() : "";
  if (s) return s;
  throw new Error("Missing AUTH_SECRET");
}

function secretKey(env: CloudflareEnv) {
  return new TextEncoder().encode(requireSecret(env));
}

export async function signAccessToken(
  env: CloudflareEnv,
  claims: { userId: string; username: string; role: UserRole },
): Promise<{ token: string; csrfToken: string }> {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();
  const csrfToken = crypto.randomUUID();
  
  const token = await new SignJWT({ username: claims.username, role: claims.role, jti, csrfToken })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SEC)
    .sign(secretKey(env));
  
  return { token, csrfToken };
}

export async function verifyAccessToken(env: CloudflareEnv, token: string): Promise<JwtUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(env), { algorithms: ["HS256"] });
    const payloadRecord = payload as Record<string, unknown>;
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    const username = typeof payloadRecord.username === "string" ? payloadRecord.username : "";
    const roleRaw = payloadRecord.role;
    const jti = typeof payloadRecord.jti === "string" ? payloadRecord.jti : "";
    const csrfToken = typeof payloadRecord.csrfToken === "string" ? payloadRecord.csrfToken : "";
    const exp = typeof payload.exp === "number" ? payload.exp : 0;
    if (!userId || !username || !jti || !csrfToken || exp <= 0) return null;
    if (roleRaw !== "admin" && roleRaw !== "maintainer" && roleRaw !== "reader") return null;
    const blacklistKey = `auth:blacklist:${jti}`;
    const blocked = await env.KV.get(blacklistKey, "text");
    if (blocked) return null;
    return { userId, username, role: roleRaw, jti, csrfToken, exp };
  } catch {
    return null;
  }
}

export async function revokeToken(env: CloudflareEnv, user: JwtUser) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(60, user.exp - now);
  await env.KV.put(`auth:blacklist:${user.jti}`, "1", { expirationTtl: ttl });
}

export function validateCsrfToken(user: JwtUser, csrfToken: string): boolean {
  return user.csrfToken === csrfToken;
}

