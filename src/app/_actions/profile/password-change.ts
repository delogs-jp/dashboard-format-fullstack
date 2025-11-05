// src/app/_actions/profile/password-change.ts（新規）
// Server Action：本人のパスワードを変更（argon2 で再ハッシュ）

"use server";

import { prisma } from "@/lib/database";
import argon2 from "argon2";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { passwordChangeSchema } from "@/lib/users/schema";

export type PasswordChangeResult =
  | { ok: true }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

export async function changeMyPasswordAction(
  formData: FormData,
): Promise<PasswordChangeResult> {
  // 1) セッション → 本人特定
  const session = await lookupSessionFromCookie();
  if (!session.ok) {
    return { ok: false, message: "認証が必要です" };
  }

  // 2) 入力値（Server 側でも厳格に検証）
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: (formData.get("currentPassword") as string | null) ?? "",
    newPassword: (formData.get("newPassword") as string | null) ?? "",
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "newPassword");
      fe[key] = issue.message;
    }
    return { ok: false, fieldErrors: fe };
  }
  const { currentPassword, newPassword } = parsed.data;

  // 3) 本人レコード取得（最低限の項目）
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      hashedPassword: true,
      isActive: true,
      // 任意列: passwordChangedAt を使う場合に備える
    },
  });
  if (!me || !me.isActive) {
    return {
      ok: false,
      message: "ユーザーが見つからないか、無効化されています",
    };
  }

  // 4) 現在パスワードの照合（変更画面なので失敗カウントは上げない）
  const ok = await argon2.verify(me.hashedPassword, currentPassword);
  if (!ok) {
    return {
      ok: false,
      fieldErrors: { currentPassword: "現在のパスワードが違います" },
    };
  }

  // 5) 同値チェック
  const same = await argon2.verify(me.hashedPassword, newPassword);
  if (same) {
    return {
      ok: false,
      fieldErrors: { newPassword: "現在と同じパスワードは使えません" },
    };
  }

  // 6) 再ハッシュ → DB更新
  const newHash = await argon2.hash(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: me.id },
      data: {
        hashedPassword: newHash,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // --- 他セッション失効（現在セッションのみ生かす） ---
    // 現在セッションIDは cookie->JWT -> middleware で jti を使っている想定。
    // ここでは簡易に「自分のセッションを全削除→新セッション発行」をせず、
    // '現在以外' のセッションを revoke する運用（列があるなら）。
    await tx.session.updateMany({
      where: { userId: me.id, id: { not: session.sessionId } },
      data: { revokedAt: new Date() },
    });
  });

  return { ok: true };
}
