import { b64urlDecode, b64urlEncode } from "@/lib/base64url";
import { parseUserRole, type UserRole } from "@/lib/authz";

export type AuthSession = {
  userId: string;
  username: string;
  role: UserRole;
  exp: number;
};

export const SESSION_COOKIE_KEY = "ve_session";

function getAuthSecret(): string {
  const v = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && !v?.trim()) {
    throw new Error("Missing AUTH_SECRET in production.");
  }
  return v?.trim() || "ve-maint-dev-secret-change-me";
}

let hmacKeyPromise: Promise<CryptoKey> | null = null;
async function importHmacKey() {
  if (!hmacKeyPromise) {
    const enc = new TextEncoder();
    hmacKeyPromise = crypto.subtle.importKey(
      "raw",
      enc.encode(getAuthSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return hmacKeyPromise;
}

export async function signSession(session: AuthSession): Promise<string> {
  const key = await importHmacKey();
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify(session)));
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${b64urlEncode(new Uint8Array(sigBuffer))}`;
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const key = await importHmacKey();
  const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), new TextEncoder().encode(payload));
  if (!ok) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Partial<AuthSession>;
    const role = parseUserRole(parsed.role);
    if (!parsed.userId || !parsed.username || !role || !parsed.exp) return null;
    if (parsed.exp * 1000 < Date.now()) return null;
    return {
      userId: parsed.userId,
      username: parsed.username,
      role,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

