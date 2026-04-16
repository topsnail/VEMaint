import type { Role } from "./auth";

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
export type RolePermissions = Record<Role, PermissionKey[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  admin: [...PERMISSION_KEYS],
  maintainer: ["app.view", "vehicle.view", "maintenance.view", "maintenance.edit"],
  reader: ["app.view", "vehicle.view", "maintenance.view"],
};

export const PERMISSION_GROUPS: Array<{ key: string; label: string; items: Array<{ key: PermissionKey; label: string; desc: string }> }> = [
  {
    key: "general",
    label: "通用",
    items: [
      { key: "app.view", label: "基础浏览", desc: "可进入系统并查看页面内容。" },
      { key: "logs.view", label: "查看日志", desc: "可访问系统操作日志。" },
    ],
  },
  {
    key: "vehicle",
    label: "车辆台账",
    items: [
      { key: "vehicle.view", label: "查看车辆", desc: "可查看车辆台账与详情。" },
      { key: "vehicle.manage", label: "管理车辆", desc: "可新增/编辑车辆、更新车辆状态。" },
    ],
  },
  {
    key: "maintenance",
    label: "维保管理",
    items: [
      { key: "maintenance.view", label: "查看维保", desc: "可查看维保记录与周期。" },
      { key: "maintenance.edit", label: "编辑维保", desc: "可新增/编辑维保记录与车辆周期、上传附件。" },
      { key: "maintenance.delete", label: "删除维保", desc: "可删除维保记录。" },
    ],
  },
  {
    key: "system",
    label: "系统管理",
    items: [
      { key: "user.manage", label: "用户管理", desc: "可新增用户、改角色、禁用、重置密码。" },
      { key: "config.manage", label: "系统配置", desc: "可修改系统配置与权限矩阵。" },
    ],
  },
  {
    key: "export",
    label: "导出",
    items: [
      { key: "export.vehicles", label: "导出车辆", desc: "可导出车辆数据。" },
      { key: "export.maintenance", label: "导出维保", desc: "可导出维保数据。" },
    ],
  },
];

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
    admin: admin.size ? [...admin] : fallback.admin,
    maintainer: maintainer.size ? [...maintainer] : fallback.maintainer,
    reader: reader.size ? [...reader] : fallback.reader,
  };
}

export function hasPerm(role: Role, key: PermissionKey, rolePermissions: RolePermissions | null | undefined): boolean {
  const source = rolePermissions ?? DEFAULT_ROLE_PERMISSIONS;
  return source[role]?.includes(key) ?? false;
}
