// src/app/_actions/users/password-requests.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { z } from "zod";
import { getEffectiveRole } from "@/lib/auth/effective-role";
import { sendMail } from "@/lib/mailer";
import { passwordIssued } from "@/lib/email/templates";
import { generatePassword } from "@/lib/security/password";
import * as argon2 from "argon2";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

// ADMIN 相当（メール変更申請と同値）
const ADMIN_PRIORITY_THRESHOLD = 100;

const idSchema = z.object({ id: z.string().uuid() });

/** 呼び出しユーザが ADMIN（実効 priority>=100）かつ同一部署かを確認 */
async function requireAdminSameDepartment(
  userId: string,
  departmentId: string,
) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      isActive: true,
      departmentId: true,
      roleId: true,
      departmentRoleId: true,
    },
  });

  if (!me || !me.isActive)
    return { ok: false as const, message: "ユーザが無効化されています。" };

  if (me.departmentId !== departmentId)
    return { ok: false as const, message: "越権操作です。" };

  let eff = null;
  if (me.departmentRoleId) {
    eff = await getEffectiveRole({
      departmentId: me.departmentId,
      departmentRoleId: me.departmentRoleId,
    });
  } else if (me.roleId) {
    eff = await getEffectiveRole({
      departmentId: me.departmentId,
      roleId: me.roleId,
    });
  }
  if (!eff || eff.priority < ADMIN_PRIORITY_THRESHOLD)
    return { ok: false as const, message: "権限がありません。" };

  return { ok: true as const, meName: me.name ?? "ADMIN" };
}

/**
 * 再発行（ISSUED）
 * - 競合対策: status=PENDING を条件に updateMany
 * - 同一Txで User.hashedPassword を argon2 で更新
 * - 成功後に依頼メール宛に新パスワードを通知
 */
export async function issuePasswordRequestAction(
  formData: FormData,
): Promise<ActionResult> {
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です" };

  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: "IDが不正です" };

  // 対象取得
  const req = await prisma.passwordRequest.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      status: true,
      departmentId: true,
      userId: true,
      emailPuny: true,
      // 通知メール用に名前・部署情報も拾う
      user: { select: { name: true } },
    },
  });
  if (!req) return { ok: false, message: "依頼が見つかりません" };

  if (!req.departmentId || !req.userId) {
    return {
      ok: false,
      message:
        "対象ユーザが特定できないため処理できません（部署/ユーザ未解決）。",
    };
  }

  // 権限チェック
  const g = await requireAdminSameDepartment(ses.userId, req.departmentId);
  if (!g.ok) return g;

  if (req.status !== "PENDING") {
    return { ok: false, message: "未処理の依頼のみ再発行できます" };
  }

  // 新パスワード生成 & ハッシュ
  const newPassword = generatePassword(20);
  const hashed = await argon2.hash(newPassword, { type: argon2.argon2id });

  // Tx: 条件付きで依頼をISSUEDにし、ユーザのパスワードを更新
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.passwordRequest.updateMany({
      where: { id: req.id, status: "PENDING" },
      data: {
        status: "ISSUED",
        processedAt: new Date(),
        processedBy: g.meName,
      },
    });
    if (updated.count !== 1)
      return { ok: false as const, message: "競合が発生しました" };

    await tx.user.update({
      where: { id: req.userId! },
      data: { hashedPassword: hashed },
    });

    // 成功を返しつつ、メール本文に使う情報を渡す
    return {
      ok: true as const,
      data: {
        to: req.emailPuny,
        userName: req.user?.name ?? "",
        newPassword,
      },
    };
  });

  if (!result.ok) return result;

  // メール通知（失敗しても処理は成功）
  try {
    const { subject, text } = passwordIssued({
      name: result.data!.userName,
      email: result.data!.to,
      newPassword: result.data!.newPassword,
    });
    await sendMail({ to: result.data!.to, subject, text });
  } catch (e) {
    console.error("[mail] password reissue notification failed:", e);
  }

  return { ok: true };
}

/**
 * 拒否（REJECTED）
 * - 競合対策: status=PENDING を条件に updateMany
 */
export async function rejectPasswordRequestAction(
  formData: FormData,
): Promise<ActionResult> {
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です" };

  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: "IDが不正です" };

  const req = await prisma.passwordRequest.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true, departmentId: true },
  });
  if (!req) return { ok: false, message: "依頼が見つかりません" };
  if (!req.departmentId)
    return { ok: false, message: "部署未解決の依頼は却下できません" };

  const g = await requireAdminSameDepartment(ses.userId, req.departmentId);
  if (!g.ok) return g;

  if (req.status !== "PENDING") {
    return { ok: false, message: "未処理の依頼のみ拒否できます" };
  }

  const updated = await prisma.passwordRequest.updateMany({
    where: { id: req.id, status: "PENDING" },
    data: {
      status: "REJECTED",
      processedAt: new Date(),
      processedBy: g.meName,
    },
  });
  if (updated.count !== 1) return { ok: false, message: "競合が発生しました" };

  return { ok: true };
}
