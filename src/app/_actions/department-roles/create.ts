// src/app/_actions/department-roles/create.ts
"use server";

import "server-only";
import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getUserSnapshot } from "@/lib/auth/user-snapshot";
import {
  departmentRoleCreateSchema,
  type DepartmentRoleCreateValues,
} from "@/lib/department-roles/schema";

/** 共通仕様に合わせた返却型（将来は共通モジュールへ移動して import 推奨） */
type ActionResult = { ok: true } | { ok: false; message: string };

/** 部署ロール（custom）新規作成 */
export async function createDepartmentRole(
  values: DepartmentRoleCreateValues,
): Promise<ActionResult> {
  // 1) 認証
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です。" };

  // 2) 権限（書き込み権限が必要）
  const snap = await getUserSnapshot(ses.userId);
  if (!snap || !snap.canEditData) {
    return { ok: false, message: "この操作を行う権限がありません。" };
  }

  // 3) 所属部署の解決
  const me = await prisma.user.findUnique({
    where: { id: ses.userId },
    select: { departmentId: true },
  });
  if (!me?.departmentId) {
    return { ok: false, message: "部署情報を取得できませんでした。" };
  }

  // 4) サーバ側の最終入力検証（詳細なフィールドエラーは UI に委譲）
  const parsed = departmentRoleCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "入力内容を確認してください。" };
  }
  const {
    code,
    name,
    priority,
    badgeColor,
    isEnabled,
    canDownloadData,
    canEditData,
    remarks,
  } = parsed.data;

  // 5) 部署内コード重複チェック（@@unique([departmentId, code]) の前に早期弾く）
  const exists = await prisma.departmentRole.findFirst({
    where: { departmentId: me.departmentId, code },
    select: { id: true },
  });
  if (exists) {
    return { ok: false, message: "このコードは既に使用されています。" };
  }

  // 6) 登録（custom 固定: roleId は常に NULL）
  try {
    await prisma.departmentRole.create({
      data: {
        departmentId: me.departmentId,
        code,
        name,
        priority,
        badgeColor: badgeColor ?? null,
        isEnabled,
        canDownloadData,
        canEditData,
        isSystem: false, // custom 作成は部署ローカルなので system 扱いしない
        remarks: remarks ?? null,
      },
      select: { id: true }, // 返却しないが SELECT は最小限に
    });
  } catch (e) {
    // ユニーク制約 or CHECK 失敗などの一般化したエラーメッセージ
    console.error("[createDepartmentRole] DB create failed:", e);
    return { ok: false, message: "ロールの登録に失敗しました。" };
  }

  // 7) 完了
  return { ok: true };
}
