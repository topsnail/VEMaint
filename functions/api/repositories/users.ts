import { d1All, d1First, d1Run } from "../db/d1";
import type { UserRole } from "../types";

export type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  disabled: number;
  created_at: string;
  updated_at: string;
};

export async function getUserByUsername(db: D1Database, username: string): Promise<UserRow | null> {
  return await d1First<UserRow>(db, "select * from users where username = ?1", [username]);
}

export async function hasAdminUser(db: D1Database): Promise<boolean> {
  const row = await d1First<{ total: number }>(db, "select count(1) as total from users where role = 'admin'");
  return Number(row?.total ?? 0) > 0;
}

export async function listUsers(db: D1Database): Promise<Array<Omit<UserRow, "password_hash">>> {
  return await d1All<Omit<UserRow, "password_hash">>(
    db,
    "select id, username, role, disabled, created_at, updated_at from users order by created_at asc",
  );
}

export async function createUser(db: D1Database, input: { username: string; passwordHash: string; role: UserRole }) {
  const id = crypto.randomUUID();
  await d1Run(
    db,
    "insert into users (id, username, password_hash, role, disabled, created_at, updated_at) values (?1, ?2, ?3, ?4, 0, datetime('now'), datetime('now'))",
    [id, input.username, input.passwordHash, input.role],
  );
  return id;
}

export async function updateUserRole(db: D1Database, id: string, role: UserRole) {
  await d1Run(db, "update users set role = ?1, updated_at = datetime('now') where id = ?2", [role, id]);
}

export async function updateUserPassword(db: D1Database, id: string, passwordHash: string) {
  await d1Run(db, "update users set password_hash = ?1, updated_at = datetime('now') where id = ?2", [passwordHash, id]);
}

export async function setUserDisabled(db: D1Database, id: string, disabled: boolean) {
  await d1Run(db, "update users set disabled = ?1, updated_at = datetime('now') where id = ?2", [disabled ? 1 : 0, id]);
}

export async function deleteUser(db: D1Database, id: string) {
  await d1Run(db, "delete from users where id = ?1", [id]);
}

