// src/app/_actions/auth/logout.ts
"use server";

import { prisma } from "@/lib/database";
import { cookies } from "next/headers";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { verifySessionJwt } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";

export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { jti } = await verifySessionJwt(token);
      await prisma.session.update({
        where: { id: jti },
        data: { revokedAt: new Date() },
      });
    } catch {
      // 署名エラーや期限切れは無視してCookieだけ消す
    }
  }
  await clearSessionCookie();
  redirect("/");
}
