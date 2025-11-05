// src/app/_actions/auth/password-forgot.ts
"use server";

import { prisma } from "@/lib/database";
import { headers } from "next/headers";
import { sendMail } from "@/lib/mailer";
import { z } from "zod";
import { accountIdSchema, emailSchema } from "@/lib/users/schema";
import { adminPasswordForgotNotify } from "@/lib/email/templates";

/**
 * 入力（サーバ側）：trim など最終正規化を足す
 * - 形式検証は users/schema の共通スキーマを利用
 */
const serverSchema = z
  .object({
    accountId: accountIdSchema,
    email: emailSchema,
    note: z.string().optional(),
  })
  .transform((v) => ({
    ...v,
    accountId: v.accountId.trim(),
    email: v.email.trim(), // emailSchemaでpuny化済み
    note: v.note?.trim() || "",
  }));

export type PasswordForgotResult = { ok: true } | { ok: false };

const ADMIN_PRIORITY_THRESHOLD = 100;

/**
 * パスワード再発行依頼
 * - 常に存在秘匿：部署/ユーザの有無に関係なく {ok:true} を返す
 * - 入力不正 or DB障害のみ {ok:false}
 * - 部署が解決できた場合は、部署内の“ADMIN相当（priority>=100）”全員へメール通知
 */
export async function passwordForgotAction(
  values: unknown,
): Promise<PasswordForgotResult> {
  const parsed = serverSchema.safeParse(values);
  if (!parsed.success) return { ok: false };

  const { accountId, email, note } = parsed.data;

  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for") || undefined;
  const ua = h.get("user-agent") || undefined;

  try {
    // 1) 部署コード→部署解決
    const dept = await prisma.department.findUnique({
      where: { code: accountId },
      select: { id: true },
    });

    // 2) ユーザー解決（部署が特定できたら）
    const user =
      dept &&
      (await prisma.user.findFirst({
        where: {
          departmentId: dept.id,
          email, // punycode ASCIIで保存されている設計
          deletedAt: null,
        },
        select: { id: true },
      }));

    // 3) 依頼の記録（存在の有無に関わらず）
    await prisma.passwordRequest.create({
      data: {
        departmentCodeInput: accountId,
        emailPuny: email,
        note: note || null,
        ip: ip || null,
        userAgent: ua || null,
        departmentId: dept?.id ?? null,
        userId: user?.id ?? null,
        status: "PENDING",
      },
    });

    // 4) 通知（部署が解決できた場合のみ）
    if (dept?.id) {
      // 部署内のADMIN相当（priority >= 100）を抽出
      const admins = await prisma.user.findMany({
        where: {
          departmentId: dept.id,
          deletedAt: null,
          isActive: true,
          OR: [
            // Role直付けで priority>=100
            { role: { is: { priority: { gte: ADMIN_PRIORITY_THRESHOLD } } } },
            // DepartmentRole: override（参照Roleのpriority>=100 & DR有効）
            {
              departmentRole: {
                is: {
                  isEnabled: true,
                  role: { is: { priority: { gte: ADMIN_PRIORITY_THRESHOLD } } },
                },
              },
            },
            // DepartmentRole: custom（DR.priority>=100 & DR有効）
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

      // メール件名/本文（簡潔に。内部通知なので詳細OK）
      const mail = adminPasswordForgotNotify({
        accountId,
        email,
        note,
        ip,
        ua,
      });

      for (const a of admins) {
        try {
          await sendMail({
            to: a.email,
            subject: mail.subject,
            text: mail.text,
          });
        } catch (e) {
          // 通知失敗は致命でない（ログのみ）
          console.error("[mailer] password-forgot notify failed:", e);
        }
      }
    }

    // 存在秘匿：常に成功メッセージ
    return { ok: true };
  } catch (e) {
    console.error("[passwordForgotAction] failed:", e);
    // 入力は正しいがDB障害など
    return { ok: false };
  }
}
