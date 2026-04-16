import type { Context } from "hono";

type JsonRecord = Record<string, unknown>;

export async function readJsonRecord(c: Context): Promise<JsonRecord> {
  const body = await c.req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as JsonRecord) : {};
}

export function getStringField(body: JsonRecord, key: string, fallback = ""): string {
  const value = body[key];
  return typeof value === "string" ? value : fallback;
}

export function getTrimmedStringField(body: JsonRecord, key: string, fallback = ""): string {
  return getStringField(body, key, fallback).trim();
}

export function getNullableTrimmedStringField(body: JsonRecord, key: string): string | null {
  const value = getTrimmedStringField(body, key);
  return value || null;
}

export function getNumberField(body: JsonRecord, key: string, fallback = 0): number {
  const value = body[key];
  const num = typeof value === "number" ? value : Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

export function getOptionalNumberField(body: JsonRecord, key: string): number | null {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function getBooleanField(body: JsonRecord, key: string): boolean {
  return Boolean(body[key]);
}
