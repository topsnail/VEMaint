const KEY = "ve_token";
const USER_KEY = "ve_user";

export type Role = "admin" | "maintainer" | "reader";
export type UserInfo = { userId: string; username: string; role: Role };

export function getToken(): string | null {
  const v = localStorage.getItem(KEY);
  return v && v.trim() ? v : null;
}

export function setToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearToken() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

export function setUser(user: UserInfo) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): UserInfo | null {
  const raw = localStorage.getItem(USER_KEY);
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

