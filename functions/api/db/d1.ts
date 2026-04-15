export type D1Row = Record<string, unknown>;

export async function d1All<T extends D1Row>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await db.prepare(sql).bind(...params).all<T>();
  return (res.results ?? []) as T[];
}

export async function d1First<T extends D1Row>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const res = await db.prepare(sql).bind(...params).first<T>();
  return (res ?? null) as T | null;
}

export async function d1Run(db: D1Database, sql: string, params: unknown[] = []) {
  return await db.prepare(sql).bind(...params).run();
}

