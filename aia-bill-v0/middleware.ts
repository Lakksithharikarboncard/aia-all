import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "korefi_session";

// Routes that don't require auth
const PUBLIC_PREFIXES = [
  "/auth",
  "/portal",
  "/get-started",
  "/checkout",
  "/api/auth",
  "/api/sync",
  "/api/dodo/webhooks",
  "/api/customers",
  "/_next",
  "/favicon",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // proxy/ covers the dev-mode assetPrefix (/proxy/5660/_next/static/...)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|proxy/).*)"],
};
