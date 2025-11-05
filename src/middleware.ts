// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionJwt } from "@/lib/auth/jwt";

const LOGIN_PATH = "/";

// 保護対象パスのプレフィックス一覧
const PROTECTED_PATHS = [
  "/changelog",
  "/dashboard",
  "/masters",
  "/tutorial",
  "/users",
  "/profile",
  "/avatar",
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get(
      process.env.SESSION_COOKIE_NAME ?? "session",
    )?.value;

    if (!token) {
      const url = new URL(LOGIN_PATH, req.url);
      url.searchParams.set("continue", pathname + search); // ← 元のURLを保持
      return NextResponse.redirect(url);
    }

    try {
      await verifySessionJwt(token);
      return NextResponse.next();
    } catch {
      const url = new URL(LOGIN_PATH, req.url);
      url.searchParams.set("continue", pathname + search);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/changelog/:path*",
    "/dashboard/:path*",
    "/masters/:path*",
    "/tutorial/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/avatar/:path*",
  ],
};
