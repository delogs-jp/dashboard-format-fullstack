// src/lib/auth/cookies.ts
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";
const TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS ?? "3600");
const isProd = process.env.NODE_ENV === "production";

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}
export function getSessionTtlSeconds(): number {
  return TTL_SECONDS;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd, // ★ 本番のみ true
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
