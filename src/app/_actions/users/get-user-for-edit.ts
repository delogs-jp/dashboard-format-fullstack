// src/app/_actions/users/get-user-for-edit.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getUserSnapshot } from "@/lib/auth/user-snapshot";

export type UserForEdit = {
  displayId: string;
  name: string;
  email: string;
  isActive: boolean;
  phone?: string | null;
  remarks?: string | null;
  /** フォーム直結用： "role:<id>" | "dr:<id>" */
  roleCode: string;
  /** options 補完用の現在割当（無効DRでも見せるため） */
  currentAssignment?: { value: string; label: string; disabled?: boolean };
};

export async function getUserForEditAction(
  displayId: string, // ★ page 側から渡される表示ID
): Promise<{ ok: true; data: UserForEdit } | { ok: false; message: string }> {
  // 1) 認証 & 権限（編集権限が無ければそもそも表示不可）
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "Unauthorized" };
  const snap = await getUserSnapshot(ses.userId);
  if (!snap?.canEditData) return { ok: false, message: "Forbidden" };

  // 2) ログインユーザの部署を取得
  const me = await prisma.user.findUnique({
    where: { id: ses.userId },
    select: { departmentId: true },
  });
  if (!me) return { ok: false, message: "Not found" };

  // 3) 対象ユーザを「同一部署」かつ「論理削除なし」で取得
  const user = await prisma.user.findFirst({
    where: {
      displayId,
      departmentId: me.departmentId, // ★ 部署縛り
      deletedAt: null,
    },
    select: {
      displayId: true,
      name: true,
      email: true, // DBは punycode ASCII（表示側で変換するならここで変換して返してもOK）
      isActive: true,
      phone: true,
      remarks: true,
      roleId: true,
      role: { select: { id: true, code: true, name: true } },
      departmentRoleId: true,
      departmentRole: {
        select: {
          id: true,
          isEnabled: true,
          code: true,
          name: true,
          role: { select: { code: true, name: true } },
          nameOverride: true,
        },
      },
    },
  });
  if (!user) return { ok: false, message: "Not found" };

  // 4) XOR 文字列へ正規化 & 現在割当のラベル化
  let roleCode = "";
  let currentAssignment: UserForEdit["currentAssignment"] | undefined;

  if (user.departmentRoleId && user.departmentRole) {
    roleCode = `dr:${user.departmentRoleId}`;
    const base = user.departmentRole.role ?? null; // override の参照元
    const label = base
      ? `${user.departmentRole.nameOverride ?? base.name} （${base.code}）`
      : `${user.departmentRole.name ?? user.departmentRole.code ?? "CUSTOM"} （${user.departmentRole.code ?? "DR"}）`;
    currentAssignment = {
      value: roleCode,
      label,
      disabled: !user.departmentRole.isEnabled,
    };
  } else if (user.roleId && user.role) {
    roleCode = `role:${user.roleId}`;
    currentAssignment = {
      value: roleCode,
      label: `${user.role.name} （${user.role.code}）`,
      disabled: false,
    };
  } else {
    // XOR 的に両方空は異常だが、UI側で未選択扱いにしておく
    roleCode = "";
  }

  return {
    ok: true,
    data: {
      displayId: user.displayId,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      phone: user.phone,
      remarks: user.remarks,
      roleCode,
      currentAssignment,
    },
  };
}
