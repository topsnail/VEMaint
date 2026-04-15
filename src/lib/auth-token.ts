import { b64urlDecode, b64urlEncode } from "@/lib/base64url";
import { parseUserRole, type UserRole } from "@/lib/authz";
import { importAuthHmacKey } from "@/lib/runtime-secret";

export type AuthSession = {
  userId: string;
  username: string;
  role: UserRole;
  exp: number;
};

export const SESSION_COOKIE_KEY = "ve_session";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

export async function signSession(session: AuthSession): Promise<string> {
  const key = await importAuthHmacKey();
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify(session)));
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${b64urlEncode(new Uint8Array(sigBuffer))}`;
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const key = await importAuthHmacKey();
  const ok = await crypto.subtle.verify("HMAC", key, toArrayBuffer(b64urlDecode(sig)), new TextEncoder().encode(payload));
  if (!ok) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(toArrayBuffer(b64urlDecode(payload)))) as Partial<AuthSession>;
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
