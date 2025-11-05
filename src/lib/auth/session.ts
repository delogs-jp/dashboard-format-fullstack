// src/lib/auth/session.ts
import { verifySessionJwt } from "./jwt";
import { cookies } from "next/headers";
import { prisma } from "@/lib/database";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";

export type SessionLookupResult =
  | { ok: true; sessionId: string; userId: string }
  | { ok: false };

export async function lookupSessionFromCookie(): Promise<SessionLookupResult> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return { ok: false };

  try {
    const { jti } = await verifySessionJwt(token);
    const session = await prisma.session.findUnique({
      where: { id: jti },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
    if (!session) return { ok: false };
    if (session.revokedAt) return { ok: false };
    if (session.expiresAt.getTime() <= Date.now()) return { ok: false };
    return { ok: true, sessionId: session.id, userId: session.userId };
  } catch {
    return { ok: false };
  }
}
