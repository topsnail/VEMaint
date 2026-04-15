import { Hono } from "hono";
import type { CloudflareEnv } from "../../env";
import { jsonError, jsonOk } from "./lib/response";
import { authRoute } from "./routes/auth";
import { assetsRoute } from "./routes/assets";
import { filesRoute } from "./routes/files";

export const app = new Hono<{ Bindings: CloudflareEnv }>();

app.onError((err, c) => {
  console.error(err);
  return jsonError(c, "INTERNAL_ERROR", "服务异常", 500);
});

app.notFound((c) => jsonError(c, "NOT_FOUND", "接口不存在", 404));

app.get("/api/health", (c) => jsonOk(c, { ok: true }));

app.route("/", authRoute);
app.route("/", assetsRoute);
app.route("/", filesRoute);

