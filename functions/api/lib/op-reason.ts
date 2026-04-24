import type { Context } from "hono";
import { jsonError } from "./response";
import type { AppEnv } from "../types";

function decodeHeaderValue(raw: string): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function readOpReason(c: Context<AppEnv>): string | null {
  const reason = decodeHeaderValue(c.req.header("x-op-reason") ?? "").trim();
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
