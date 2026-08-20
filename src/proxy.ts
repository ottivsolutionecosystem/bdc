import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
const STATIC_FILE = /\.(?:ico|png|jpe?g|gif|webp|svg|woff2?)$/i;

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/password/") ||
    pathname.startsWith("/brand/") ||
    STATIC_FILE.test(pathname);

  if (isPublic) return NextResponse.next();

  if (!req.auth?.user || !req.auth.user.active) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
