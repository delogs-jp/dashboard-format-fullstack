// src/app/_actions/profile/email-status.ts
// 本人の最新 EmailChangeRequest を1件返すだけの Server Action
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import type { EmailChangeStatus } from "@prisma/client";

export type MyEmailChangeSummary =
  | { exists: false }
  | {
      exists: true;
      status: EmailChangeStatus; // "PENDING" | "VERIFIED" | "APPROVED" ...
      expiresAt?: Date | null; // APPROVED のときは null でもOK
      newEmail: string; // punycode（ASCII）
      currentEmail: string; // いまのスナップショット（User.email, ASCII）
      needsRelogin: boolean; // 承認済みかつ currentEmail !== newEmail
    };

export async function getMyEmailChangeStatus(): Promise<MyEmailChangeSummary> {
  const session = await lookupSessionFromCookie();
  if (!session.ok) return { exists: false };

  // 直近の申請（PENDING / VERIFIED / APPROVED）を対象にする
  const r = await prisma.emailChangeRequest.findFirst({
    where: {
      userId: session.userId,
      status: { in: ["PENDING", "VERIFIED", "APPROVED"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      expiresAt: true,
      newEmailPuny: true,
      user: { select: { email: true } }, // スナップショット比較用
    },
  });

  if (!r) return { exists: false };

  const currentEmail = r.user.email; // punycode ASCII（大小は保存方針どおり）
  const needsRelogin =
    r.status === "APPROVED" && currentEmail !== r.newEmailPuny;

  return {
    exists: true,
    status: r.status,
    // APPROVED では期限は意味がないので null に寄せて返す（UIで分岐しやすい）
    expiresAt: r.status === "APPROVED" ? null : r.expiresAt,
    newEmail: r.newEmailPuny,
    currentEmail,
    needsRelogin,
  };
}
