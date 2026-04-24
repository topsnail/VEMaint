import type { Context } from "hono";
import type { AppEnv } from "../types";
import { readOpReason } from "./op-reason";

export function buildLogMeta(c: Context<AppEnv>) {
  return {
    ip: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null,
    userAgent: c.req.header("user-agent") ?? null,
    reason: readOpReason(c),
  };
}
