import { Hono } from "hono";
import { jsonError, jsonOk } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { r2Delete, r2Get, r2Put } from "../services/r2";
import type { AppEnv } from "../types";

export const filesRoute = new Hono<AppEnv>();
filesRoute.use("/api/files/*", requireAuth);
filesRoute.use("/api/upload", requireAuth, permitPerm("maintenance.edit"));
filesRoute.use("/api/files/check", requireAuth);

function safeDecodePathKey(rawPath: string): string | null {
  const raw = rawPath.replace(/^\/api\/files\//, "");
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
}

filesRoute.get("/api/files/*", async (c) => {
  const key = safeDecodePathKey(c.req.path);
  if (key == null) return jsonError(c, "BAD_REQUEST", "无效 key 编码", 400);
  if (!key) return jsonError(c, "BAD_REQUEST", "无效 key", 400);
  const obj = await r2Get(c.env.R2, key);
  if (!obj) return jsonError(c, "NOT_FOUND", "文件不存在", 404);

  const headers = new Headers();
  const ct = obj.httpMetadata?.contentType;
  headers.set("Content-Type", ct || "application/octet-stream");
  if (obj.size !== undefined) headers.set("Content-Length", String(obj.size));
  // Preview images are generated at upload time and immutable per key; cache longer to save bandwidth.
  const isPreviewWebp = key.endsWith(".preview.webp");
  const isDirectWebp = key.endsWith(".webp") && !key.endsWith(".preview.webp");
  headers.set("Cache-Control", isPreviewWebp || isDirectWebp ? "private, max-age=604800" : "private, max-age=60");
  return new Response(obj.body, { status: 200, headers });
});

filesRoute.post("/api/upload", async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) return jsonError(c, "BAD_REQUEST", "请使用 multipart/form-data", 400);
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(c, "BAD_REQUEST", "缺少 file", 400);
  const preview = form.get("preview");
  const previewFile = preview instanceof File ? preview : null;
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const key = `maintenance/${Date.now()}-${crypto.randomUUID()}${ext}`;
  await r2Put(c.env.R2, {
    key,
    body: file.stream(),
    contentType: file.type || "application/octet-stream",
    cacheControl: "private, max-age=60",
  });
  let previewKey: string | null = null;
  if (previewFile && (file.type || "").startsWith("image/")) {
    previewKey = `${key}.preview.webp`;
    await r2Put(c.env.R2, {
      key: previewKey,
      body: previewFile.stream(),
      contentType: previewFile.type || "image/webp",
      cacheControl: "private, max-age=60",
    });
  }
  return jsonOk(
    c,
    {
      key,
      url: `/api/files/${encodeURIComponent(key)}`,
      previewKey,
      previewUrl: previewKey ? `/api/files/${encodeURIComponent(previewKey)}` : null,
    },
    201,
  );
});

filesRoute.delete("/api/files/*", permitPerm("maintenance.edit"), async (c) => {
  const key = safeDecodePathKey(c.req.path);
  if (key == null) return jsonError(c, "BAD_REQUEST", "无效 key 编码", 400);
  if (!key) return jsonError(c, "BAD_REQUEST", "无效 key", 400);
  await r2Delete(c.env.R2, key);
  // For source images, also cleanup generated preview object.
  if (!key.endsWith(".preview.webp")) {
    await r2Delete(c.env.R2, `${key}.preview.webp`);
  }
  return jsonOk(c, { ok: true });
});

filesRoute.post("/api/files/check", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { keys?: unknown } | null;
  const rawKeys = Array.isArray(body?.keys) ? body?.keys : [];
  const keys = rawKeys
    .map((k) => String(k ?? "").trim())
    .filter(Boolean)
    .filter((k, idx, arr) => arr.indexOf(k) === idx)
    .slice(0, 200);
  const checks: Array<{ key: string; exists: boolean }> = [];
  const concurrency = 20;
  for (let i = 0; i < keys.length; i += concurrency) {
    const chunk = keys.slice(i, i + concurrency);
    const chunkChecks = await Promise.all(
      chunk.map(async (key) => {
        const obj = await r2Get(c.env.R2, key);
        return { key, exists: !!obj };
      }),
    );
    checks.push(...chunkChecks);
  }
  return jsonOk(c, { checks });
});

