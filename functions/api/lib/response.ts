import type { Context } from "hono";

export type ApiError = { code: string; message: string };
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: ApiError };
export type ApiResult<T> = ApiOk<T> | ApiErr;

export function jsonOk<T>(c: Context, data: T, status = 200) {
  return c.json({ ok: true, data } satisfies ApiOk<T>, status);
}

export function jsonError(c: Context, code: string, message: string, status = 400) {
  return c.json({ ok: false, error: { code, message } } satisfies ApiErr, status);
}

