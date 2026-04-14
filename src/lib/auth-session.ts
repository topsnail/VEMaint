"use server";

import { cookies } from "next/headers";
import { loadAppSettings } from "@/lib/app-settings";
import { getCloudflareEnv } from "@/lib/cf-env";
import { hasAuthUsers } from "@/lib/auth-users";
import { verifySessionToken, SESSION_COOKIE_KEY, type AuthSession } from "@/lib/auth-token";
import type { UserRole } from "@/lib/authz";

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
  const { KV } = getCloudflareEnv();
  const app = await loadAppSettings(KV);
  return app.roleMode;
}

