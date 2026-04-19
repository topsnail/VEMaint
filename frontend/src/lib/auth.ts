import { STORAGE_KEYS } from "./config";

const KEY = STORAGE_KEYS.TOKEN;
const USER_KEY = STORAGE_KEYS.USER;
const CSRF_KEY = STORAGE_KEYS.CSRF;

export type Role = "admin" | "maintainer" | "reader";
export type UserInfo = { userId: string; username: string; role: Role };

export function getToken(): string | null {
  const v = sessionStorage.getItem(KEY);
  return v && v.trim() ? v : null;
}

export function setToken(token: string) {
  sessionStorage.setItem(KEY, token);
}

export function getCsrfToken(): string | null {
  const v = sessionStorage.getItem(CSRF_KEY);
  return v && v.trim() ? v : null;
}

export function setCsrfToken(csrfToken: string) {
  sessionStorage.setItem(CSRF_KEY, csrfToken);
}

export function clearToken() {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(CSRF_KEY);
}

export function setUser(user: UserInfo) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): UserInfo | null {
  const raw = sessionStorage.getItem(USER_KEY);
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

