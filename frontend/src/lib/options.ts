export function normalizeDropdownOptions(source: string[] | undefined, fallback: string[] = []): string[] {
  const input = (source && source.length > 0 ? source : fallback) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of input) {
    const parts = String(raw ?? "")
      .replace(/，/g, ",")
      .split(/,|\/|、|\r?\n|\s+/)
      .map((x) => x.trim())
      .filter(Boolean);

    for (const item of parts) {
      if (seen.has(item)) continue;
      seen.add(item);
      result.push(item);
    }
  }

  return result.length > 0 ? result : fallback;
}

