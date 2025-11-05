// src/app/_actions/users/email-change-requests.ts（修正後）
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { sendMail } from "@/lib/mailer";
import { emailChangeApproved } from "@/lib/email/templates";
import { z } from "zod";
import { getEffectiveRole } from "@/lib/auth/effective-role";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

// ADMIN 相当のしきい値（update-user.ts と同一）
const ADMIN_PRIORITY_THRESHOLD = 100;

const idSchema = z.object({ id: z.uuid() });

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

  // 実効ロールを取得
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

  // 呼び出し側で processedBy に使うので name も返す
  return { ok: true as const, meName: me.name ?? "ADMIN" };
}

export async function approveEmailChangeRequestAction(
  formData: FormData,
): Promise<ActionResult> {
  // 1) 認証
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です" };

  // 2) 入力検証
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: "IDが不正です" };

  // 3) 対象取得
  const req = await prisma.emailChangeRequest.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      status: true,
      userId: true,
      departmentId: true,
      oldEmailPuny: true,
      newEmailPuny: true,
      user: { select: { email: true } },
    },
  });
  if (!req) return { ok: false, message: "申請が見つかりません" };

  let operatorName;
  // 4) ADMIN & 同部署チェック（実効ロール）
  {
    const g = await requireAdminSameDepartment(ses.userId, req.departmentId);
    if (!g.ok) return g;
    // 承認者名に利用
    operatorName = g.meName;
  }

  if (req.status !== "VERIFIED")
    return { ok: false, message: "本人確認済みの申請のみ承認できます" };

  // 5) 競合対策: 条件付き更新 + 反映
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.emailChangeRequest.updateMany({
      where: { id: req.id, status: "VERIFIED" },
      data: {
        status: "APPROVED",
        processedAt: new Date(),
        processedBy: operatorName,
      },
    });
    if (updated.count !== 1)
      return { ok: false as const, message: "競合が発生しました" };

    // ユーザのメールを更新（punycode ASCII で保存する設計）
    await tx.user.update({
      where: { id: req.userId },
      data: { email: req.newEmailPuny },
    });

    // 任意: 他の保留申請を自動クローズ
    await tx.emailChangeRequest.updateMany({
      where: {
        userId: req.userId,
        id: { not: req.id },
        status: { in: ["PENDING", "VERIFIED"] },
      },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
        processedBy: "system",
      },
    });

    return { ok: true as const };
  });

  if (!result.ok) return result;

  // 6) 承認通知メール（失敗しても処理は成功）
  try {
    const { subject, text } = emailChangeApproved({
      newEmail: req.newEmailPuny,
    });
    await sendMail({ to: req.newEmailPuny, subject, text });
  } catch (e) {
    console.error("[mail] approve notification failed:", e);
  }

  return { ok: true };
}

export async function rejectEmailChangeRequestAction(
  formData: FormData,
): Promise<ActionResult> {
  // 1) 認証
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です" };

  // 2) 入力検証
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: "IDが不正です" };

  // 3) 対象取得
  const req = await prisma.emailChangeRequest.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true, departmentId: true },
  });
  if (!req) return { ok: false, message: "申請が見つかりません" };

  // 4) ADMIN & 同部署チェック（実効ロール）
  let operatorName;
  {
    const g = await requireAdminSameDepartment(ses.userId, req.departmentId);
    if (!g.ok) return g;
    operatorName = g.meName;
  }

  if (!["PENDING", "VERIFIED"].includes(req.status))
    return { ok: false, message: "未処理の申請のみ却下できます" };

  // 5) 競合対策: 条件付き更新
  const updated = await prisma.emailChangeRequest.updateMany({
    where: { id: req.id, status: { in: ["PENDING", "VERIFIED"] } },
    data: {
      status: "REJECTED",
      processedAt: new Date(),
      processedBy: operatorName,
    },
  });
  if (updated.count !== 1) return { ok: false, message: "競合が発生しました" };

  return { ok: true };
}
