export type SafeJsonParseOptions<T> = {
  fallback: T;
};

export function safeJsonParse<T>(text: string | null | undefined, opts: SafeJsonParseOptions<T>): T {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return opts.fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return opts.fallback;
  }
}

