import type { UserRole } from "../types";

export const PERMISSION_KEYS = [
  "app.view",
  "vehicle.view",
  "vehicle.manage",
  "maintenance.view",
  "maintenance.edit",
  "maintenance.delete",
  "user.manage",
  "config.manage",
  "export.vehicles",
  "export.maintenance",
  "logs.view",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type RolePermissions = Record<UserRole, PermissionKey[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  admin: [...PERMISSION_KEYS],
  maintainer: ["app.view", "vehicle.view", "maintenance.view", "maintenance.edit"],
  reader: ["app.view", "vehicle.view", "maintenance.view"],
};

function toPermissionSet(list: unknown): Set<PermissionKey> {
  if (!Array.isArray(list)) return new Set<PermissionKey>();
  const valid = new Set<string>(PERMISSION_KEYS);
  const out = new Set<PermissionKey>();
  for (const item of list) {
    const key = String(item ?? "").trim();
    if (valid.has(key)) out.add(key as PermissionKey);
  }
  return out;
}

export function normalizeRolePermissions(input: unknown): RolePermissions {
  const fallback = DEFAULT_ROLE_PERMISSIONS;
  if (!input || typeof input !== "object") return fallback;
  const obj = input as Record<string, unknown>;
  const rolesObj = (obj.roles ?? obj) as Record<string, unknown>;
  const admin = toPermissionSet(rolesObj.admin);
  const maintainer = toPermissionSet(rolesObj.maintainer);
  const reader = toPermissionSet(rolesObj.reader);
  return {
    admin: (admin.size ? [...admin] : fallback.admin),
    maintainer: (maintainer.size ? [...maintainer] : fallback.maintainer),
    reader: (reader.size ? [...reader] : fallback.reader),
  };
}

export function hasPermission(role: UserRole, key: PermissionKey, rolePermissions: RolePermissions): boolean {
  return rolePermissions[role]?.includes(key) ?? false;
}
