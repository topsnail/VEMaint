import { useMemo } from "react";
import { hasPerm } from "./permissions";
import type { Role, UserInfo } from "./auth";
import type { RolePermissions } from "./permissions";

export function usePermissions(user: UserInfo | null, rolePermissions: RolePermissions | null) {
  return useMemo(() => {
    if (!user) {
      return {
        canViewDashboard: false,
        canViewVehicles: false,
        canManageVehicle: false,
        canViewMaintenance: false,
        canEditMaintenance: false,
        canDeleteMaintenance: false,
        canManageUsers: false,
        canManageConfig: false,
        canExportVehicles: false,
        canExportMaintenance: false,
        canViewLogs: false,
      };
    }

    const role = user.role;
    
    return {
      canViewDashboard: hasPerm(role, "app.view", rolePermissions),
      canViewVehicles: hasPerm(role, "vehicle.view", rolePermissions),
      canManageVehicle: hasPerm(role, "vehicle.manage", rolePermissions),
      canViewMaintenance: hasPerm(role, "maintenance.view", rolePermissions),
      canEditMaintenance: hasPerm(role, "maintenance.edit", rolePermissions),
      canDeleteMaintenance: hasPerm(role, "maintenance.delete", rolePermissions),
      canManageUsers: hasPerm(role, "user.manage", rolePermissions),
      canManageConfig: hasPerm(role, "config.manage", rolePermissions),
      canExportVehicles: hasPerm(role, "export.vehicles", rolePermissions),
      canExportMaintenance: hasPerm(role, "export.maintenance", rolePermissions),
      canViewLogs: hasPerm(role, "logs.view", rolePermissions),
    };
  }, [user, rolePermissions]);
}
