import { b64urlDecode, b64urlEncode } from "./base64url";

const AUTH_USERS_KEY = "auth:users:v1";
const PASSWORD_ITERATIONS = 100000;
const PASSWORD_ITERATIONS_LEGACY = 210000;
const HASH_ALGO = "SHA-256";

export type UserRole = "admin" | "employee" | "viewer";
export type PermissionKey =
  | "assets.read"
  | "assets.write"
  | "assets.delete"
  | "assets.import"
  | "assets.export"
  | "maintenance.read"
  | "maintenance.write"
  | "maintenance.delete"
  | "reminders.read"
  | "reminders.write"
  | "reminders.delete"
  | "reminders.escalate"
  | "ledger.read"
  | "ledger.write"
  | "ledger.delete"
  | "settings.read"
  | "settings.write"
  | "users.manage"
  | "audit.read";

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
  disabled: boolean;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  permissions?: PermissionKey[] | null;
};

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

async function derivePasswordHash(password: string, saltBytes: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: HASH_ALGO, salt: toArrayBuffer(saltBytes), iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function verifyPassword(passwordRaw: string, salt: string, hash: string): Promise<boolean> {
  const password = passwordRaw.trim();
  if (!password) return false;
  const saltBytes = b64urlDecode(salt);
  const expected = b64urlDecode(hash);
  const actual = await derivePasswordHash(password, saltBytes, PASSWORD_ITERATIONS);
  if (constantTimeEqual(expected, actual)) return true;
  try {
    const legacy = await derivePasswordHash(password, saltBytes, PASSWORD_ITERATIONS_LEGACY);
    return constantTimeEqual(expected, legacy);
  } catch {
    return false;
  }
}

export function normalizeUsername(vRaw: string): string {
  return vRaw.trim().toLowerCase();
}

function parseUsers(raw: string | null): AuthUser[] {
  if (!raw?.trim()) return [];
  try {
    const rows = JSON.parse(raw) as unknown;
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((x): x is AuthUser => !!x && typeof x === "object")
      .map((x) => x as AuthUser)
      .filter((x) => !!x.id && !!x.username && !!x.passwordSalt && !!x.passwordHash)
      .map((x) => ({
        ...x,
        username: normalizeUsername(x.username),
        role: x.role === "admin" || x.role === "employee" || x.role === "viewer" ? x.role : "viewer",
        disabled: Boolean(x.disabled),
        permissions: Array.isArray((x as any).permissions) ? ((x as any).permissions as PermissionKey[]) : null,
      }));
  } catch {
    return [];
  }
}

export async function loadUsers(KV: KVNamespace): Promise<AuthUser[]> {
  const raw = await KV.get(AUTH_USERS_KEY, "text");
  return parseUsers(raw).sort((a, b) => a.username.localeCompare(b.username));
}

export async function hashPassword(passwordRaw: string): Promise<{ salt: string; hash: string }> {
  const password = passwordRaw.trim();
  if (password.length < 6) throw new Error("密码长度至少 6 位");
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hashBytes = await derivePasswordHash(password, saltBytes, PASSWORD_ITERATIONS);
  return {
    salt: b64urlEncode(saltBytes),
    hash: b64urlEncode(hashBytes),
  };
}

