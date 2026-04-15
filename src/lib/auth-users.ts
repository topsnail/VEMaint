import { getCloudflareEnv } from "@/lib/cf-env";
import { normalizePermissionKeys, type PermissionKey, type UserRole } from "@/lib/authz";
import { b64urlDecode, b64urlEncode } from "@/lib/base64url";

const AUTH_USERS_KEY = "auth:users:v1";
const PASSWORD_ITERATIONS = 210000;
const HASH_ALGO = "SHA-256";

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

async function derivePasswordHash(password: string, saltBytes: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: HASH_ALGO, salt: toArrayBuffer(saltBytes), iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(passwordRaw: string): Promise<{ salt: string; hash: string }> {
  const password = passwordRaw.trim();
  if (password.length < 6) throw new Error("密码长度至少 6 位");
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hashBytes = await derivePasswordHash(password, saltBytes);
  return {
    salt: b64urlEncode(saltBytes),
    hash: b64urlEncode(hashBytes),
  };
}

export async function verifyPassword(passwordRaw: string, salt: string, hash: string): Promise<boolean> {
  const password = passwordRaw.trim();
  if (!password) return false;
  const saltBytes = b64urlDecode(salt);
  const expected = b64urlDecode(hash);
  const actual = await derivePasswordHash(password, saltBytes);
  return constantTimeEqual(expected, actual);
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
        permissions: Array.isArray((x as { permissions?: unknown }).permissions)
          ? normalizePermissionKeys((x as { permissions?: unknown[] }).permissions)
          : null,
      }));
  } catch {
    return [];
  }
}

async function saveUsers(users: AuthUser[]) {
  const { KV } = await getCloudflareEnv();
  await KV.put(AUTH_USERS_KEY, JSON.stringify(users));
}

export async function listAuthUsers(): Promise<AuthUser[]> {
  const { KV } = await getCloudflareEnv();
  const raw = await KV.get(AUTH_USERS_KEY, "text");
  return parseUsers(raw).sort((a, b) => a.username.localeCompare(b.username));
}

export async function hasAuthUsers(): Promise<boolean> {
  const users = await listAuthUsers();
  return users.length > 0;
}

export async function createAuthUser(input: {
  username: string;
  password: string;
  role: UserRole;
  permissions?: PermissionKey[] | null;
}): Promise<AuthUser> {
  const users = await listAuthUsers();
  const username = normalizeUsername(input.username);
  if (!username) throw new Error("用户名不能为空");
  if (users.some((u) => u.username === username)) throw new Error("用户名已存在");
  const { salt, hash } = await hashPassword(input.password);
  const now = new Date().toISOString();
  const user: AuthUser = {
    id: crypto.randomUUID(),
    username,
    role: input.role,
    disabled: false,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: now,
    updatedAt: now,
    permissions: Array.isArray(input.permissions) ? normalizePermissionKeys(input.permissions) : null,
  };
  await saveUsers([...users, user]);
  return user;
}

export async function updateAuthUserRole(userId: string, role: UserRole) {
  const users = await listAuthUsers();
  const id = userId.trim();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("用户不存在");
  users[idx] = { ...users[idx], role, updatedAt: new Date().toISOString() };
  await saveUsers(users);
}

export async function updateAuthUserPassword(userId: string, password: string) {
  const users = await listAuthUsers();
  const id = userId.trim();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("用户不存在");
  const { salt, hash } = await hashPassword(password);
  users[idx] = {
    ...users[idx],
    passwordSalt: salt,
    passwordHash: hash,
    updatedAt: new Date().toISOString(),
  };
  await saveUsers(users);
}

export async function setAuthUserDisabled(userId: string, disabled: boolean) {
  const users = await listAuthUsers();
  const id = userId.trim();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("用户不存在");
  users[idx] = { ...users[idx], disabled, updatedAt: new Date().toISOString() };
  await saveUsers(users);
}

export async function updateAuthUserPermissions(userId: string, permissions: PermissionKey[] | null) {
  const users = await listAuthUsers();
  const id = userId.trim();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("用户不存在");
  users[idx] = {
    ...users[idx],
    permissions: Array.isArray(permissions) ? normalizePermissionKeys(permissions) : null,
    updatedAt: new Date().toISOString(),
  };
  await saveUsers(users);
}
