function hexOf(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(raw: string): Promise<string> {
  const p = raw.trim();
  if (p.length < 6) throw new Error("密码至少 6 位");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p));
  return hexOf(new Uint8Array(digest));
}

export async function verifyPassword(raw: string, hashHex: string): Promise<boolean> {
  const h = await hashPassword(raw);
  return h === hashHex;
}

