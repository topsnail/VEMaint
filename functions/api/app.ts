import { Hono } from "hono";
import { jsonError, jsonOk } from "./lib/response";
import { authRoute } from "./routes/auth";
import { filesRoute } from "./routes/files";
import { vehiclesRoute } from "./routes/vehicles";
import { maintenanceRoute } from "./routes/maintenance";
import { usersRoute } from "./routes/users";
import { configRoute } from "./routes/config";
import { alertsRoute } from "./routes/alerts";
import { logsRoute } from "./routes/logs";
import { exportRoute } from "./routes/export";
import { dashboardRoute } from "./routes/dashboard";
import type { AppEnv } from "./types";

export const app = new Hono<AppEnv>();

app.onError((err, c) => {
  console.error(err);
  return jsonError(c, "INTERNAL_ERROR", "服务异常", 500);
});

app.notFound((c) => jsonError(c, "NOT_FOUND", "接口不存在", 404));

app.get("/api/health", (c) => jsonOk(c, { ok: true }));

app.route("/", authRoute);
app.route("/", usersRoute);
app.route("/", vehiclesRoute);
app.route("/", maintenanceRoute);
app.route("/", filesRoute);
app.route("/", configRoute);
app.route("/", alertsRoute);
app.route("/", logsRoute);
app.route("/", exportRoute);
app.route("/", dashboardRoute);

