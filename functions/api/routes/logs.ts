import { Hono } from "hono";
import { jsonOk, toInt } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { permit } from "../middleware/permit";
import { listOperationLogs } from "../repositories/logs";
import type { AppEnv } from "../types";

export const logsRoute = new Hono<AppEnv>();
logsRoute.use("/api/logs", requireAuth, permit("admin"));

logsRoute.get("/api/logs", async (c) => {
  const limit = toInt(c.req.query("limit") ?? null, 200, 1, 1000);
  const rows = await listOperationLogs(c.env.DB, limit);
  return jsonOk(c, { logs: rows });
});

