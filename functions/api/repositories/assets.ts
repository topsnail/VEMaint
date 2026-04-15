import { d1All, d1First } from "../db/d1";

export type AssetRow = {
  id: string;
  name: string;
  type: string;
  identifier: string;
  status: string;
  purchase_date: string | null;
  created_at: string;
};

export async function listAssets(db: D1Database): Promise<AssetRow[]> {
  return await d1All<AssetRow>(
    db,
    "select id, name, type, identifier, status, purchase_date, created_at from assets order by created_at desc",
  );
}

export async function getAssetById(db: D1Database, id: string): Promise<AssetRow | null> {
  return await d1First<AssetRow>(
    db,
    "select id, name, type, identifier, status, purchase_date, created_at from assets where id = ?1",
    [id],
  );
}

