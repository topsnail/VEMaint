import { getCloudflareEnv } from "@/lib/cf-env";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const env = getCloudflareEnv();
  const { key: keySegments } = await params;
  const key = (keySegments ?? []).map(decodeURIComponent).join("/");
  if (!key) return new NextResponse("Bad Request", { status: 400 });

  const obj = await env.R2.get(key);
  if (!obj) return new NextResponse("Not Found", { status: 404 });

  const headers = new Headers();
  const ct = obj.httpMetadata?.contentType;
  headers.set("Content-Type", ct || "application/octet-stream");
  if (obj.size !== undefined) headers.set("Content-Length", String(obj.size));
  headers.set("Cache-Control", "private, max-age=60");

  return new NextResponse(obj.body, { status: 200, headers });
}

