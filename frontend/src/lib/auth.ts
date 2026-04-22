import { STORAGE_KEYS } from "./config";

const KEY = STORAGE_KEYS.TOKEN;
const USER_KEY = STORAGE_KEYS.USER;
const CSRF_KEY = STORAGE_KEYS.CSRF;

export type Role = "admin" | "maintainer" | "reader";
export type UserInfo = { userId: string; username: string; role: Role };

function readStorageValue(storage: Storage, key: string): string | null {
  const v = storage.getItem(key);
  return v && v.trim() ? v : null;
}

function safeGetLocal(key: string): string | null {
  try {
    return readStorageValue(localStorage, key);
  } catch {
    return null;
  }
}

function safeSetLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemoveLocal(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function hydrateSessionFromLocal(key: string) {
  const local = safeGetLocal(key);
  if (!local) return null;
  try {
    sessionStorage.setItem(key, local);
  } catch {
    // ignore
  }
  return local;
}

export function getToken(): string | null {
  const session = readStorageValue(sessionStorage, KEY);
  if (session) return session;
  return hydrateSessionFromLocal(KEY);
}

export function setToken(token: string) {
  sessionStorage.setItem(KEY, token);
}

export function getCsrfToken(): string | null {
  const session = readStorageValue(sessionStorage, CSRF_KEY);
  if (session) return session;
  return hydrateSessionFromLocal(CSRF_KEY);
}

export function setCsrfToken(csrfToken: string) {
  sessionStorage.setItem(CSRF_KEY, csrfToken);
}

export function clearToken() {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(CSRF_KEY);

  safeRemoveLocal(KEY);
  safeRemoveLocal(USER_KEY);
  safeRemoveLocal(CSRF_KEY);
}

export function setUser(user: UserInfo) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): UserInfo | null {
  const raw = readStorageValue(sessionStorage, USER_KEY) ?? hydrateSessionFromLocal(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserInfo>;
    if (!parsed.userId || !parsed.username) return null;
    if (parsed.role !== "admin" && parsed.role !== "maintainer" && parsed.role !== "reader") return null;
    return parsed as UserInfo;
  } catch {
    return null;
  }
}

/**
 * “记住登录”：将当前登录态持久化到 localStorage。
 * 注意：不保存明文密码，只保存 token / csrf / user。
 */
export function persistAuthSession() {
  const token = readStorageValue(sessionStorage, KEY);
  const csrf = readStorageValue(sessionStorage, CSRF_KEY);
  const user = readStorageValue(sessionStorage, USER_KEY);
  if (token) safeSetLocal(KEY, token);
  if (csrf) safeSetLocal(CSRF_KEY, csrf);
  if (user) safeSetLocal(USER_KEY, user);
}

export function clearPersistedAuthSession() {
  safeRemoveLocal(KEY);
  safeRemoveLocal(USER_KEY);
  safeRemoveLocal(CSRF_KEY);
}

export function isReadonly(role: Role) {
  return role === "reader";
}

export function canManageUsers(role: Role) {
  return role === "admin";
}

export function canManageVehicles(role: Role) {
  return role === "admin";
}

export function canEditMaintenance(role: Role) {
  return role === "admin" || role === "maintainer";
}

export function canDeleteMaintenance(role: Role) {
  return role === "admin";
}

