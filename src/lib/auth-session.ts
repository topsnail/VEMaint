"use server";

import { cookies } from "next/headers";
import { loadAppSettings } from "@/lib/app-settings";
import { getCloudflareEnv } from "@/lib/cf-env";
import { hasAuthUsers, listAuthUsers } from "@/lib/auth-users";
import { verifySessionToken, SESSION_COOKIE_KEY, type AuthSession } from "@/lib/auth-token";
import { hasPermission, resolveEffectivePermissions, type PermissionKey, type UserRole } from "@/lib/authz";

export async function getCurrentAuthSession(): Promise<AuthSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_KEY)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const session = await getCurrentAuthSession();
  if (session) return session.role;
  if (await hasAuthUsers()) return "viewer";
  const { KV } = await getCloudflareEnv();
  const app = await loadAppSettings(KV);
  return app.roleMode;
}

export async function getCurrentUserPermissions(): Promise<PermissionKey[]> {
  const session = await getCurrentAuthSession();
  if (session) {
    const users = await listAuthUsers();
    const current = users.find((u) => u.id === session.userId);
    return resolveEffectivePermissions(session.role, current?.permissions);
  }
  if (await hasAuthUsers()) return resolveEffectivePermissions("viewer");
  const role = await getCurrentUserRole();
  return resolveEffectivePermissions(role);
}

export async function hasCurrentUserPermission(permission: PermissionKey): Promise<boolean> {
  const session = await getCurrentAuthSession();
  if (session) {
    const users = await listAuthUsers();
    const current = users.find((u) => u.id === session.userId);
    return hasPermission(permission, session.role, current?.permissions);
  }
  const role = await getCurrentUserRole();
  return hasPermission(permission, role);
}

