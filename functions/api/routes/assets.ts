import { Hono } from "hono";
import { jsonError, jsonOk } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { getAssetById, listAssets } from "../repositories/assets";

export const assetsRoute = new Hono();

assetsRoute.get("/api/assets", requireAuth, async (c) => {
  const rows = await listAssets(c.env.DB);
  return jsonOk(c, { assets: rows });
});

assetsRoute.get("/api/assets/:id", requireAuth, async (c) => {
  const id = c.req.param("id").trim();
  if (!id) return jsonError(c, "BAD_REQUEST", "无效 ID", 400);
  const row = await getAssetById(c.env.DB, id);
  if (!row) return jsonError(c, "NOT_FOUND", "资产不存在", 404);
  return jsonOk(c, { asset: row });
});

