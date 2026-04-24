import { Hono } from "hono";
import { jsonOk, toInt } from "../lib/response";
import { requireAuth } from "../middleware/require-auth";
import { permitPerm } from "../middleware/permit";
import { listOperationLogs, searchOperationLogs } from "../repositories/logs";
import type { AppEnv } from "../types";

export const logsRoute = new Hono<AppEnv>();
logsRoute.use("/api/logs", requireAuth, permitPerm("logs.view"));

logsRoute.get("/api/logs", async (c) => {
  const limit = toInt(c.req.query("limit") ?? null, 200, 1, 1000);
  const offset = toInt(c.req.query("offset") ?? null, 0, 0, 1_000_000);
  const q = (c.req.query("q") ?? "").trim();
  const actor = (c.req.query("actor") ?? "").trim();
  const action = (c.req.query("action") ?? "").trim();
  const actionPrefix = (c.req.query("actionPrefix") ?? "").trim();
  const from = (c.req.query("from") ?? "").trim();
  const to = (c.req.query("to") ?? "").trim();
  const riskOnly = (c.req.query("riskOnly") ?? "").trim() === "1";

  const hasAdvanced =
    offset > 0 || q.length > 0 || actor.length > 0 || action.length > 0 || actionPrefix.length > 0 || from.length > 0 || to.length > 0 || riskOnly;
  if (!hasAdvanced) {
    const rows = await listOperationLogs(c.env.DB, limit);
    return jsonOk(c, { logs: rows, total: rows.length });
  }

  const { rows, total } = await searchOperationLogs(c.env.DB, {
    limit,
    offset,
    q: q || null,
    actor: actor || null,
    action: action || null,
    actionPrefix: actionPrefix || null,
    from: from || null,
    to: to || null,
    riskOnly,
  });
  return jsonOk(c, { logs: rows, total });
});

