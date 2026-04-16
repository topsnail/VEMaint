import { Hono } from "hono";
import { jsonError, jsonOk } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { permit } from "../middleware/permit";
import { r2Get, r2Put } from "../services/r2";
import type { AppEnv } from "../types";

export const filesRoute = new Hono<AppEnv>();
filesRoute.use("/api/files/*", requireAuth);
filesRoute.use("/api/upload", requireAuth, permit("admin", "maintainer"));

filesRoute.get("/api/files/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/files\//, "")).trim();
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

filesRoute.post("/api/upload", async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) return jsonError(c, "BAD_REQUEST", "请使用 multipart/form-data", 400);
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(c, "BAD_REQUEST", "缺少 file", 400);
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const key = `maintenance/${Date.now()}-${crypto.randomUUID()}${ext}`;
  await r2Put(c.env.R2, {
    key,
    body: file.stream(),
    contentType: file.type || "application/octet-stream",
    cacheControl: "private, max-age=60",
  });
  return jsonOk(c, { key, url: `/api/files/${encodeURIComponent(key)}` }, 201);
});

