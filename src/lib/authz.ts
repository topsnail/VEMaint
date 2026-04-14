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

export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  "assets.read",
  "assets.write",
  "assets.delete",
  "assets.import",
  "assets.export",
  "maintenance.read",
  "maintenance.write",
  "maintenance.delete",
  "reminders.read",
  "reminders.write",
  "reminders.delete",
  "reminders.escalate",
  "ledger.read",
  "ledger.write",
  "ledger.delete",
  "settings.read",
  "settings.write",
  "users.manage",
  "audit.read",
];

export function parseUserRole(raw: unknown): UserRole | null {
  return raw === "admin" || raw === "employee" || raw === "viewer" ? raw : null;
}

export function parsePermissionKey(raw: unknown): PermissionKey | null {
  return typeof raw === "string" && (ALL_PERMISSION_KEYS as string[]).includes(raw) ? (raw as PermissionKey) : null;
}

export function normalizePermissionKeys(raw: unknown): PermissionKey[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<PermissionKey>();
  for (const v of raw) {
    const key = parsePermissionKey(v);
    if (key) set.add(key);
  }
  return [...set];
}

export function defaultPermissionsByRole(role: UserRole): PermissionKey[] {
  if (role === "admin") return [...ALL_PERMISSION_KEYS];
  if (role === "employee") {
    return [
      "assets.read",
      "assets.write",
      "assets.import",
      "assets.export",
      "maintenance.read",
      "maintenance.write",
      "reminders.read",
      "reminders.write",
      "reminders.escalate",
      "ledger.read",
      "ledger.write",
      "settings.read",
    ];
  }
  return ["assets.read", "maintenance.read", "reminders.read", "ledger.read", "settings.read"];
}

export function resolveEffectivePermissions(role: UserRole, userPermissions?: PermissionKey[] | null): PermissionKey[] {
  if (Array.isArray(userPermissions)) return normalizePermissionKeys(userPermissions);
  return defaultPermissionsByRole(role);
}

export function hasPermission(permission: PermissionKey, role: UserRole, userPermissions?: PermissionKey[] | null): boolean {
  return resolveEffectivePermissions(role, userPermissions).includes(permission);
}

export function canWriteByRole(role: UserRole): boolean {
  return hasPermission("assets.write", role);
}

export function canDeleteByRole(role: UserRole): boolean {
  return hasPermission("assets.delete", role);
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission("users.manage", role);
}

export function canEditSettings(role: UserRole): boolean {
  return hasPermission("settings.write", role);
}
