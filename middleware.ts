import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySessionToken } from "./src/lib/auth-token";

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico", "/favicon.svg"]);

function isPublicAssetPath(pathname: string) {
  // allow common static files placed under /public
  return /\.(?:svg|png|jpg|jpeg|webp|gif|ico|txt|xml|json|map|css|js)$/.test(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json" ||
    isPublicAssetPath(pathname)
  ) {
    return NextResponse.next();
  }
  const token = req.cookies.get("ve_session")?.value;
  if (token) {
    const ok = await verifySessionToken(token);
    if (ok) return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  const res = NextResponse.redirect(url);
  res.cookies.delete("ve_session");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
