import type { UserRole } from "../types";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function parseRole(raw: unknown): UserRole | null {
  if (raw === "admin" || raw === "maintainer" || raw === "reader") return raw;
  return null;
}

