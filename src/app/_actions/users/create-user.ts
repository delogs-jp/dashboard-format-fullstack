// src/app/_actions/users/create-user.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getUserSnapshot } from "@/lib/auth/user-snapshot";
import { isDomainAllowed } from "@/lib/email/domain-allow";
import { userCreateSchema, type UserCreateValues } from "@/lib/users/schema";
import { sendMail } from "@/lib/mailer";
import { userWelcome } from "@/lib/email/templates";
import argon2 from "argon2";

// ★ 追加：#2 章の XOR 候補値を扱うための型
//   "role:<id>" | "dr:<id>"
type XorRoleValue = string; // 実体はセレクト value をそのまま受ける

type ActionResult = { ok: true } | { ok: false; message: string };

export async function createUser(
  values: UserCreateValues,
  selectedRoleValue?: XorRoleValue, // ← 互換用。なければ values.roleCode を使う
): Promise<ActionResult> {
  // 1) 認証
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です。" };

  // 2) 権限
  const snap = await getUserSnapshot(ses.userId);
  if (!snap || !snap.canEditData) {
    return { ok: false, message: "この操作を行う権限がありません。" };
  }

  // 3) 所属部署ID
  const me = await prisma.user.findUnique({
    where: { id: ses.userId },
    select: { departmentId: true },
  });
  if (!me) return { ok: false, message: "ユーザ情報を取得できませんでした。" };

  // 4) サーバ側の最終チェック（詳細は返さない）
  const parsed = userCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "入力内容を確認してください。" };
  }
  const { name, email, password, isActive, phone, remarks, roleCode } =
    parsed.data;

  // 5) email 正規化（trim のみ）
  const normalizedEmail = email.trim();

  // 6) 許可ドメイン
  const domainOk = await isDomainAllowed(me.departmentId, normalizedEmail);
  if (!domainOk) {
    return { ok: false, message: "このドメインは許可されていません。" };
  }

  // 7) 部署内重複
  const dup = await prisma.user.findFirst({
    where: { departmentId: me.departmentId, email: normalizedEmail },
    select: { id: true },
  });
  if (dup) {
    return { ok: false, message: "このメールアドレスは既に登録されています。" };
  }

  // 8) XOR 解決（"role:" or "dr:"）
  const xorValue = (selectedRoleValue ?? roleCode) || "";
  let roleId: string | null = null;
  let departmentRoleId: string | null = null;

  if (xorValue.startsWith("role:")) {
    roleId = xorValue.slice("role:".length);
  } else if (xorValue.startsWith("dr:")) {
    departmentRoleId = xorValue.slice("dr:".length);
  } else {
    return { ok: false, message: "ロールの指定が不正です。" };
  }

  // 9) 存在チェック（FK 例外をユーザに見せない）
  if (roleId) {
    const ok = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });
    if (!ok) return { ok: false, message: "ロールの指定が不正です。" };
  }
  if (departmentRoleId) {
    const dr = await prisma.departmentRole.findFirst({
      where: { id: departmentRoleId, departmentId: me.departmentId },
      select: { id: true, isEnabled: true },
    });
    if (!dr || !dr.isEnabled)
      return { ok: false, message: "ロールの指定が不正です。" };
  }

  // 10) パスワードハッシュ
  const hashedPassword = await argon2.hash(password);

  // 11) 登録（XOR で保存）
  let created: { name: string; department: { code: string } } | null = null;
  try {
    created = await prisma.user.create({
      data: {
        departmentId: me.departmentId,
        roleId, // どちらかが null
        departmentRoleId,
        email: normalizedEmail,
        hashedPassword,
        name,
        isActive,
        phone: phone || null,
        remarks: remarks || null,
        failedLoginCount: 0,
      },
      select: {
        name: true,
        department: { select: { code: true } }, // ← メール本文で使用
      },
    });
  } catch (e) {
    console.error("[createUser] DB create failed:", e);
    return { ok: false, message: "ユーザの登録に失敗しました。" };
  }

  // 12) メール送信（DB作成成功時のみ）

  try {
    const { subject, text } = userWelcome({
      name: created.name,
      email: normalizedEmail,
      departmentCode: created.department.code,
      initialPassword: password,
    });
    await sendMail({ to: normalizedEmail, subject, text });
  } catch (e) {
    // 送信失敗は致命にはしない（DBは作成済み）
    console.error("[mailer] failed to send welcome mail", e);
  }

  return { ok: true };
}
