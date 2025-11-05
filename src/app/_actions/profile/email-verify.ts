// src/app/_actions/profile/email-verify.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { sendMail } from "@/lib/mailer";
import { adminEmailChangeVerifiedNotify } from "@/lib/email/templates";

export type VerifyResult = { ok: true } | { ok: false; message: string };

// PasswordForgot と同基準で統一
const ADMIN_PRIORITY_THRESHOLD = 100;

export async function verifyEmailChangeAction(
  token: string,
): Promise<VerifyResult> {
  // 1) 認証
  const session = await lookupSessionFromCookie();
  if (!session.ok) {
    return { ok: false, message: "認証にはログインが必要です" };
  }

  // 2) リクエスト取得
  const req = await prisma.emailChangeRequest.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!req) {
    return {
      ok: false,
      message: "無効なURLです。認証URLを確認して再度アクセスしてください",
    };
  }
  if (req.userId !== session.userId) {
    return { ok: false, message: "ログインユーザーが一致しません" };
  }

  // 3) 期限・状態チェック
  const now = new Date();
  if (req.expiresAt < now) {
    await prisma.emailChangeRequest.update({
      where: { id: req.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, message: "このURLは有効期限が切れています" };
  }

  if (["APPROVED", "REJECTED"].includes(req.status)) {
    return { ok: false, message: "すでに処理済みの申請です" };
  }

  // 4) VERIFIED に更新
  await prisma.emailChangeRequest.update({
    where: { id: req.id },
    data: { status: "VERIFIED" },
  });

  // 5) ADMIN 全員へ通知（実効priority>=100 を網羅）
  //  - Role 直付け
  //  - DepartmentRole override（参照Roleのpriority）
  //  - DepartmentRole custom（自前priority）
  const admins = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      departmentId: req.departmentId,
      OR: [
        // Role 直付け
        {
          role: {
            is: {
              isActive: true,
              priority: { gte: ADMIN_PRIORITY_THRESHOLD },
            },
          },
        },
        // DepartmentRole: override（参照Roleのpriorityで判定、DRは有効）
        {
          departmentRole: {
            is: {
              isEnabled: true,
              role: {
                is: { priority: { gte: ADMIN_PRIORITY_THRESHOLD } },
              },
            },
          },
        },
        // DepartmentRole: custom（DR.priorityで判定、DRは有効）
        {
          departmentRole: {
            is: {
              isEnabled: true,
              roleId: null,
              priority: { gte: ADMIN_PRIORITY_THRESHOLD },
            },
          },
        },
      ],
    },
    select: { email: true },
  });

  // 失敗しても致命にはしない（並列で送る）
  await Promise.allSettled(
    admins.map((a) => {
      const mail = adminEmailChangeVerifiedNotify({
        userName: req.user.name,
        userEmail: req.user.email,
      });
      return sendMail({ to: a.email, subject: mail.subject, text: mail.text });
    }),
  );

  return { ok: true };
}
