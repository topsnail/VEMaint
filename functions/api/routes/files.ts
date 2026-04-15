import { Hono } from "hono";
import { jsonError, jsonOk } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { r2Get, r2Put } from "../services/r2";

export const filesRoute = new Hono();

filesRoute.get("/api/files/:key", requireAuth, async (c) => {
  const key = c.req.param("key").trim();
  if (!key) return jsonError(c, "BAD_REQUEST", "无效 key", 400);
  const obj = await r2Get(c.env.R2, key);
  if (!obj) return jsonError(c, "NOT_FOUND", "文件不存在", 404);

  const headers = new Headers();
  const ct = obj.httpMetadata?.contentType;
  headers.set("Content-Type", ct || "application/octet-stream");
  if (obj.size !== undefined) headers.set("Content-Length", String(obj.size));
  headers.set("Cache-Control", "private, max-age=60");
  return new Response(obj.body, { status: 200, headers });
});

filesRoute.put("/api/files/:key", requireAuth, async (c) => {
  const key = c.req.param("key").trim();
  if (!key) return jsonError(c, "BAD_REQUEST", "无效 key", 400);
  const contentType = c.req.header("content-type") ?? "application/octet-stream";
  const body = c.req.raw.body;
  if (!body) return jsonError(c, "BAD_REQUEST", "缺少文件内容", 400);
  await r2Put(c.env.R2, { key, body, contentType, cacheControl: "private, max-age=60" });
  return jsonOk(c, { key });
});

