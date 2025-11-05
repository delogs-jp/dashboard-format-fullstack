// src/app/_actions/auth/login.ts
"use server";

import { prisma } from "@/lib/database";
import argon2 from "argon2";
import {
  loginServerSchema,
  type LoginServerInput,
} from "@/lib/login/server-schema";
import { signSessionJwt } from "@/lib/auth/jwt";
import { setSessionCookie, getSessionTtlSeconds } from "@/lib/auth/cookies";
import { getUserSnapshot } from "@/lib/auth/user-snapshot";
import type { AuthUserSnapshot } from "@/lib/auth/types";

const LOCK_THRESHOLD = Number(process.env.LOCK_THRESHOLD ?? "5");
const LOCK_MINUTES = Number(process.env.LOCK_MINUTES ?? "15");
const AUTH_ERROR_MODE = process.env.AUTH_ERROR_MODE ?? "detailed"; // "ambiguous" | "detailed"

type FieldErrors = Partial<Record<keyof LoginServerInput, string>>;

function ambiguousMessage(): string {
  return "アカウントまたは認証情報が正しくありません";
}

function maybeAmbiguous(fieldErrors?: FieldErrors, fallback?: string) {
  if (AUTH_ERROR_MODE === "ambiguous") {
    return { ok: false as const, message: ambiguousMessage() };
  }
  if (fieldErrors) return { ok: false as const, fieldErrors };
  return { ok: false as const, message: fallback ?? ambiguousMessage() };
}

export type LoginActionResult =
  | { ok: true; user: AuthUserSnapshot }
  | { ok: false; fieldErrors?: FieldErrors; message?: string };

export async function loginAction(
  input: LoginServerInput,
): Promise<LoginActionResult> {
  // 1) サーバ側バリデーション（※ loginSchema 側で punycode 正規化済み）
  const parsed = loginServerSchema.safeParse(input);
  if (!parsed.success) {
    const fe: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as keyof LoginServerInput;
      fe[path] = issue.message;
    }
    return { ok: false, fieldErrors: fe };
  }
  // ★ ここで得られる email は「punycode ASCII（大小保持）」、accountId は trim 済み
  const { accountId, email, password } = parsed.data;

  // 2) 部署を特定
  const department = await prisma.department.findUnique({
    where: { code: accountId },
  });
  if (!department) {
    // ユーザーが特定できないためカウントはできない。メッセージは項目別 or 曖昧化。
    return maybeAmbiguous({ accountId: "アカウントIDが見つかりません" });
  }

  // 3) ユーザー特定
  const user = await prisma.user.findFirst({
    where: { departmentId: department.id, email },
    select: {
      id: true,
      hashedPassword: true,
      failedLoginCount: true,
      lockedUntil: true,
      isActive: true,
    },
  });
  if (!user) {
    // ここもユーザー未特定のためカウント不可。メッセージは項目別 or 曖昧化。
    return maybeAmbiguous({ email: "メールアドレスが見つかりません" });
  }

  // 4) ロック/無効チェック（ここではカウントは増やさない）
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return {
      ok: false,
      message: `アカウントがロックされています。時間をおいて再試行してください。`,
    };
  }
  if (!user.isActive) {
    return maybeAmbiguous(undefined, "このアカウントは無効化されています。");
  }

  // 5) パスワード検証
  const passwordOk = await argon2.verify(user.hashedPassword, password);
  if (!passwordOk) {
    // 失敗：ユーザー特定済みなので +1（原子的）
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });

    if (updated.failedLoginCount >= LOCK_THRESHOLD) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0, // ロック発火時にリセット
          lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
        },
      });
      return {
        ok: false,
        message: `一定回数以上の失敗によりロックされました。${LOCK_MINUTES}分後に再試行してください。`,
      };
    }

    // 閾値に近づいたら曖昧化（もしくはモードが ambiguous なら常に曖昧）
    if (updated.failedLoginCount >= Math.max(1, LOCK_THRESHOLD - 2)) {
      return { ok: false, message: ambiguousMessage() };
    }
    return maybeAmbiguous({ password: "パスワードが違います" });
  }

  // 6) 成功：カウンタ/ロック解除
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  // 7) セッション発行（DB + JWT + Cookie）
  const ttl = getSessionTtlSeconds();
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + ttl * 1000) },
    select: { id: true, userId: true },
  });
  const token = await signSessionJwt({ jti: session.id }, ttl);
  await setSessionCookie(token);

  // 8) スナップショット取得
  const snapshot = await getUserSnapshot(user.id);
  if (!snapshot)
    return { ok: false, message: "ユーザー情報取得に失敗しました" };

  return { ok: true, user: snapshot };
}
