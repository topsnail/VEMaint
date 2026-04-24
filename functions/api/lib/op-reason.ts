import type { Context } from "hono";
import { jsonError } from "./response";
import type { AppEnv } from "../types";

export function readOpReason(c: Context<AppEnv>): string | null {
  const reason = (c.req.header("x-op-reason") ?? "").trim();
  return reason || null;
}

export function requireOpReason(c: Context<AppEnv>) {
  const reason = readOpReason(c);
  if (reason) return { ok: true as const, reason };
  return {
    ok: false as const,
    response: jsonError(c, "BAD_REQUEST", "高风险操作需要填写操作理由", 400),
  };
}
