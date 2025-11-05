// src/app/_actions/department-roles/update.ts
"use server";

import "server-only";
import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getUserSnapshot } from "@/lib/auth/user-snapshot";
import {
  departmentRoleUpdateSchema,
  type DepartmentRoleUpdateValues,
} from "@/lib/department-roles/schema";

type ActionResult = { ok: true } | { ok: false; message: string };

export async function updateDepartmentRole(
  values: DepartmentRoleUpdateValues,
): Promise<ActionResult> {
  // 1) 認証
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です。" };

  // 2) 権限
  const snap = await getUserSnapshot(ses.userId);
  if (!snap || !snap.canEditData) {
    return { ok: false, message: "この操作を行う権限がありません。" };
  }

  // 3) 所属部署
  const me = await prisma.user.findUnique({
    where: { id: ses.userId },
    select: { departmentId: true },
  });
  if (!me?.departmentId)
    return { ok: false, message: "部署情報を取得できませんでした。" };

  // 4) サーバ最終検証
  const parsed = departmentRoleUpdateSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, message: "入力内容を確認してください。" };

  const v = parsed.data;

  // 5) 分岐
  if (v.kind === "custom") {
    // 部署内コード重複（自分以外）
    const dup = await prisma.departmentRole.findFirst({
      where: {
        departmentId: me.departmentId,
        code: v.code,
        NOT: { displayId: v.displayId },
      },
      select: { id: true },
    });
    if (dup)
      return { ok: false, message: "このコードは既に使用されています。" };

    try {
      await prisma.departmentRole.update({
        where: { displayId: v.displayId },
        data: {
          code: v.code,
          name: v.name,
          priority: v.priority,
          badgeColor: v.badgeColor ?? null,
          isEnabled: v.isEnabled,
          canDownloadData: v.canDownloadData,
          canEditData: v.canEditData,
          remarks: v.remarks ?? null,
        },
      });
    } catch (e) {
      console.error("[updateDepartmentRole/custom] DB update failed:", e);
      return { ok: false, message: "更新に失敗しました。" };
    }
    return { ok: true };
  }

  // override: 既存 or 初回
  try {
    if (v.displayId) {
      // 既存 override を更新
      await prisma.departmentRole.update({
        where: { displayId: v.displayId },
        data: {
          isEnabled: v.isEnabled,
          nameOverride: v.nameOverride ?? null,
          badgeColorOverride: v.badgeColorOverride ?? null,
        },
      });
    } else if (v.roleDisplayId) {
      // 初回作成（roleId を解決して作成）
      const role = await prisma.role.findUnique({
        where: { displayId: v.roleDisplayId },
        select: { id: true },
      });
      if (!role)
        return { ok: false, message: "対象ロールを取得できませんでした。" };

      await prisma.departmentRole.create({
        data: {
          departmentId: me.departmentId,
          roleId: role.id,
          isEnabled: v.isEnabled,
          nameOverride: v.nameOverride ?? null,
          badgeColorOverride: v.badgeColorOverride ?? null,
        },
      });
    } else {
      return { ok: false, message: "表示IDの指定が不足しています。" };
    }
  } catch (e) {
    console.error("[updateDepartmentRole/override] failed:", e);
    return { ok: false, message: "更新に失敗しました。" };
  }

  return { ok: true };
}

export async function deleteDepartmentRole(
  displayId: string,
): Promise<ActionResult> {
  // 1) 認証/権限
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です。" };
  const snap = await getUserSnapshot(ses.userId);
  if (!snap || !snap.canEditData) {
    return { ok: false, message: "この操作を行う権限がありません。" };
  }

  // 2) 存在確認（custom or override どちらでも可）
  const dr = await prisma.departmentRole.findUnique({
    where: { displayId },
    select: { id: true, roleId: true },
  });
  if (!dr) return { ok: false, message: "対象が見つかりません。" };

  // 3) 削除（custom も override も DELETE。override はベース Role に戻る効果）
  try {
    await prisma.departmentRole.delete({ where: { displayId } });
  } catch (e) {
    console.error("[deleteDepartmentRole] DB delete failed:", e);
    return { ok: false, message: "削除に失敗しました。" };
  }

  return { ok: true };
}
