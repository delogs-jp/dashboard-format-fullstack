// src/lib/auth/guard.ssr.ts
import { redirect } from "next/navigation";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getUserSnapshot } from "@/lib/auth/user-snapshot";
// ★ DB版の判定に切替
import { decideGuardAsync } from "./guard.core";
import { prisma } from "@/lib/database";

/** 成功時は UserSnapshot を返し、失敗時は redirect/エラーで終了 */
export async function guardHrefOrRedirect(href: string, loginPath = "/") {
  const session = await lookupSessionFromCookie();
  if (!session.ok) {
    redirect(loginPath); // 401相当
  }

  const user = await getUserSnapshot(session.userId);
  if (!user) {
    redirect(loginPath);
  }

  // ★ 最小差分：departmentId を軽量SELECT（後で snapshot に含めて削除予定）
  const u = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { departmentId: true },
  });
  const departmentId = u?.departmentId ?? "";

  const decision = await decideGuardAsync(href, user, departmentId, {
    strictNotFound: true,
  });

  if (!decision.ok) {
    if (decision.reason === "UNAUTHORIZED") redirect(loginPath);
    if (decision.reason === "FORBIDDEN") redirect("/403");
    if (decision.reason === "NOT_FOUND") redirect("/404");
  }

  return user; // page.tsx から機能フラグ等も参照可能
}
