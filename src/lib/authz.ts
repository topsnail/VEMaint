export type UserRole = "admin" | "employee" | "viewer";

export function parseUserRole(raw: unknown): UserRole | null {
  return raw === "admin" || raw === "employee" || raw === "viewer" ? raw : null;
}

export function canWriteByRole(role: UserRole): boolean {
  return role !== "viewer";
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function canManageUsers(role: UserRole): boolean {
  return isAdmin(role);
}

export function canEditSettings(role: UserRole): boolean {
  return isAdmin(role);
}
