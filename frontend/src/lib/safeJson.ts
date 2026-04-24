export type SafeJsonParseOptions<T> = {
  fallback: T;
};

/**
 * Parse JSON safely.
 * - Returns fallback on empty input or parse error.
 * - Keeps callsites consistent and removes repetitive try/catch.
 */
export function safeJsonParse<T>(text: string | null | undefined, opts: SafeJsonParseOptions<T>): T {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return opts.fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return opts.fallback;
  }
}

