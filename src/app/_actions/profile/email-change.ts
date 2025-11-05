// src/app/_actions/profile/email-change.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { isDomainAllowed } from "@/lib/email/domain-allow";
import { sendMail } from "@/lib/mailer";
import { emailChangeVerify } from "@/lib/email/templates";
import { toAsciiEmailSafe } from "@/lib/email/normalize";
import crypto from "node:crypto";

export type ActionResult = { ok: true } | { ok: false; message?: string };

const REQUEST_TTL_HOURS = 24; // 有効期限

export async function sendEmailChangeRequestAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await lookupSessionFromCookie();
  if (!session.ok) return { ok: false, message: "認証が必要です" };

  const rawNewEmail = (formData.get("newEmail") as string | null)?.trim();
  if (!rawNewEmail)
    return { ok: false, message: "新しいメールアドレスが未入力です" };

  // 念のためサーバ側でも punycode 正規化
  const newEmailAscii = toAsciiEmailSafe(rawNewEmail);
  if (!newEmailAscii.includes("@")) {
    return { ok: false, message: "メールアドレス形式が不正です" };
  }

  // ユーザー＋部署を特定
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      departmentId: true,
      isActive: true,
    },
  });
  if (!me || !me.isActive)
    return { ok: false, message: "ユーザーが見つかりません" };
  if (newEmailAscii.toLowerCase() === me.email.toLowerCase()) {
    return { ok: false, message: "現在のメールアドレスと同一です" };
  }
  // ドメイン許可チェック
  const allowed = await isDomainAllowed(me.departmentId, newEmailAscii);
  if (!allowed) {
    return { ok: false, message: "このドメインのメールは申請できません" };
  }
  // トークン＆期限生成（推測困難な base64url 文字列）
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + REQUEST_TTL_HOURS * 60 * 60 * 1000);

  // 申請を作成（PENDING）— 失敗したらメールは絶対送らない
  let requestId: string | null = null;
  try {
    const rec = await prisma.emailChangeRequest.create({
      data: {
        userId: me.id,
        departmentId: me.departmentId,
        oldEmailPuny: me.email,
        newEmailPuny: newEmailAscii, // punycode ASCII
        token,
        status: "PENDING",
        expiresAt,
      },
      select: { id: true },
    });
    requestId = rec.id;
  } catch (e) {
    console.error("[email-change] failed to insert request", e);
    return { ok: false, message: "申請の登録に失敗しました" };
  }

  // 認証メール送信（DB作成が成功したときだけ実施／失敗は処理継続）
  try {
    const { subject, text } = emailChangeVerify({
      newEmail: newEmailAscii,
      token,
      expiresAt,
    });
    await sendMail({ to: newEmailAscii, subject, text });
  } catch (e) {
    // 送信失敗はロールバックしない（運用で再送）
    console.error("[mailer] failed to send email-change verify mail", {
      requestId,
      error: e,
    });
  }

  return { ok: true };
}
