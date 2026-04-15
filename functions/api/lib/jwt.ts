import { SignJWT, jwtVerify } from "jose";
import type { CloudflareEnv } from "../../../env";

export type JwtClaims = {
  sub: string;
  username: string;
  role: "admin" | "employee" | "viewer";
};

function requireSecret(env: CloudflareEnv): string {
  const s = typeof env.AUTH_SECRET === "string" ? env.AUTH_SECRET.trim() : "";
  if (!s) throw new Error("Missing AUTH_SECRET");
  return s;
}

function secretKey(env: CloudflareEnv) {
  return new TextEncoder().encode(requireSecret(env));
}

export async function signAccessToken(env: CloudflareEnv, claims: JwtClaims, ttlSec: number) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ username: claims.username, role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSec)
    .sign(secretKey(env));
}

export async function verifyAccessToken(env: CloudflareEnv, token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(env), { algorithms: ["HS256"] });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const username = typeof (payload as any).username === "string" ? String((payload as any).username) : "";
    const role = (payload as any).role;
    if (!sub || !username) return null;
    if (role !== "admin" && role !== "employee" && role !== "viewer") return null;
    return { sub, username, role };
  } catch {
    return null;
  }
}

