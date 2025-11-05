// src/app/_actions/users/update-user.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { userUpdateSchema, type UserUpdateValues } from "@/lib/users/schema";
import { isDomainAllowed } from "@/lib/email/domain-allow";
import { toAsciiEmailSafe } from "@/lib/email/normalize";
import { getEffectiveRole } from "@/lib/auth/effective-role";

type ActionResult = { ok: true } | { ok: false; message: string };

// ADMIN 相当のしきい値（前章と同じ基準を利用）
const ADMIN_PRIORITY_THRESHOLD = 100;

/* ─────────────────────────────────────────────
   ユーティリティ
   ───────────────────────────────────────────── */

/** displayId から編集対象を部署縛りで取得（削除済みは除外） */
async function findEditableUserByDisplayId(displayId: string) {
  return prisma.user.findFirst({
    where: { displayId, deletedAt: null },
    select: {
      id: true,
      displayId: true,
      email: true,
      name: true,
      departmentId: true,
      isActive: true,
      phone: true,
      remarks: true,
      roleId: true,
      departmentRoleId: true,
    },
  });
}

/** 呼び出しユーザが ADMIN（実効ロール priority>=100）かつ同一部署かを確認 */
async function requireAdminSameDepartmentXor(
  userId: string,
  departmentId: string,
) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
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

  // 実効ロールを取得（両方 null の場合は eff=null 扱い）
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

  return { ok: true as const };
}

/** 部署内の“有効な管理者（実効 priority>=100）”の人数を数える */
async function countActiveAdmins(departmentId: string) {
  // role / override / custom すべてをカバー
  return prisma.user.count({
    where: {
      departmentId,
      deletedAt: null,
      isActive: true,
      OR: [
        // Role 直付けで priority>=100
        { role: { is: { priority: { gte: ADMIN_PRIORITY_THRESHOLD } } } },
        // DepartmentRole: override（参照Roleのpriorityで判定、DRは有効）
        {
          departmentRole: {
            is: {
              isEnabled: true,
              role: { is: { priority: { gte: ADMIN_PRIORITY_THRESHOLD } } },
            },
          },
        },
        // DepartmentRole: custom（DR.priorityで判定、DRは有効）
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
  });
}

/** XOR 文字列を roleId / departmentRoleId に解決 */
function parseXorRoleCode(roleCode: string | undefined) {
  let roleId: string | null = null;
  let departmentRoleId: string | null = null;
  if (roleCode?.startsWith("role:")) {
    roleId = roleCode.slice("role:".length);
  } else if (roleCode?.startsWith("dr:")) {
    departmentRoleId = roleCode.slice("dr:".length);
  }
  return { roleId, departmentRoleId };
}

/** 入力後の実効ロールを試算（isActive=false は非管理者扱い） */
async function getEffectivePriorityAfterUpdate(params: {
  departmentId: string;
  roleId: string | null;
  departmentRoleId: string | null;
  isActive: boolean;
}) {
  if (!params.isActive) return -1; // 無効化されるなら管理者からは外れる
  const { departmentId, roleId, departmentRoleId } = params;
  // 両方 null の場合は非管理者扱い
  if (!roleId && !departmentRoleId) return -1;
  let eff = null;
  if (departmentRoleId) {
    eff = await getEffectiveRole({ departmentId, departmentRoleId });
  } else if (roleId) {
    eff = await getEffectiveRole({ departmentId, roleId });
  }

  return eff?.priority ?? -1;
}

/* ─────────────────────────────────────────────
   ユーザ情報の更新（XOR 対応）
   ───────────────────────────────────────────── */
export async function updateUserAction(
  values: UserUpdateValues,
): Promise<ActionResult> {
  // 1) 認証
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です。" };

  // 2) 対象取得（削除済み除外）
  const target = await findEditableUserByDisplayId(values.displayId);
  if (!target) return { ok: false, message: "対象ユーザが見つかりません。" };

  // 3) ADMIN & 同部署チェック（実効ロール）
  {
    const g = await requireAdminSameDepartmentXor(
      ses.userId,
      target.departmentId,
    );
    if (!g.ok) return g;
  }

  // 4) 入力検証（roleCode は XOR 文字列）
  const parsed = userUpdateSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, message: "入力内容を確認してください。" };

  const { name, email, roleCode, isActive, phone, remarks } = parsed.data;

  // 5) email 正規化 & 許可ドメイン
  const asciiEmail = toAsciiEmailSafe(email).trim();
  {
    const ok = await isDomainAllowed(target.departmentId, asciiEmail);
    if (!ok)
      return { ok: false, message: "このドメインは許可されていません。" };
  }

  // 6) メール重複（同部署・自身除外）
  {
    const dup = await prisma.user.findFirst({
      where: {
        departmentId: target.departmentId,
        email: asciiEmail,
        deletedAt: null,
        id: { not: target.id },
      },
      select: { id: true },
    });
    if (dup)
      return {
        ok: false,
        message: "このメールアドレスは既に登録されています。",
      };
  }

  // 7) XOR 解決 & 存在チェック
  const { roleId: newRoleId, departmentRoleId: newDepartmentRoleId } =
    parseXorRoleCode(roleCode);

  if (!newRoleId && !newDepartmentRoleId) {
    return { ok: false, message: "ロールの指定が不正です。" };
  }
  if (newRoleId) {
    const exists = await prisma.role.findUnique({
      where: { id: newRoleId },
      select: { id: true },
    });
    if (!exists) return { ok: false, message: "ロールの指定が不正です。" };
  }
  if (newDepartmentRoleId) {
    const dr = await prisma.departmentRole.findFirst({
      where: { id: newDepartmentRoleId, departmentId: target.departmentId },
      select: { id: true, isEnabled: true },
    });
    if (!dr || !dr.isEnabled)
      return { ok: false, message: "ロールの指定が不正です。" };
  }

  // 8) “唯一の管理者”保護
  // 現在この部署に有効な管理者が何名いるか
  const currentAdmins = await countActiveAdmins(target.departmentId);

  // 対象ユーザの「今の」実効 priority
  const currentEffPriority = await getEffectivePriorityAfterUpdate({
    departmentId: target.departmentId,
    roleId: target.roleId,
    departmentRoleId: target.departmentRoleId,
    isActive: target.isActive,
  });
  const targetIsAdminNow = currentEffPriority >= ADMIN_PRIORITY_THRESHOLD;

  // 入力後の「未来の」実効 priority
  const futureEffPriority = await getEffectivePriorityAfterUpdate({
    departmentId: target.departmentId,
    roleId: newRoleId,
    departmentRoleId: newDepartmentRoleId,
    isActive,
  });
  const targetIsAdminFuture = futureEffPriority >= ADMIN_PRIORITY_THRESHOLD;

  if (targetIsAdminNow && !targetIsAdminFuture && currentAdmins <= 1) {
    return {
      ok: false,
      message:
        "この部署の有効な管理者がこの1名のみのため、管理者権限を外せません。別の管理者を追加してから再試行してください。",
    };
  }

  // 9) 更新（XOR で保存）
  await prisma.user.update({
    where: { id: target.id },
    data: {
      name,
      email: asciiEmail,
      roleId: newRoleId,
      departmentRoleId: newDepartmentRoleId,
      isActive,
      phone: phone || null,
      remarks: remarks || null,
    },
  });

  return { ok: true };
}

/* ─────────────────────────────────────────────
   論理削除（deletedAt を設定）— “唯一の管理者”保護対応
   ───────────────────────────────────────────── */
export async function deleteUserAction(
  displayId: string,
): Promise<ActionResult> {
  // 1) 認証
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false, message: "認証が必要です。" };

  // 2) 対象取得
  const target = await findEditableUserByDisplayId(displayId);
  if (!target) return { ok: false, message: "対象ユーザが見つかりません。" };

  // 3) ADMIN & 同部署チェック
  {
    const g = await requireAdminSameDepartmentXor(
      ses.userId,
      target.departmentId,
    );
    if (!g.ok) return g;
  }

  // 4) “唯一の管理者”保護（削除で管理者がいなくならないか）
  const currentAdmins = await countActiveAdmins(target.departmentId);
  const targetEffPriority = await getEffectivePriorityAfterUpdate({
    departmentId: target.departmentId,
    roleId: target.roleId,
    departmentRoleId: target.departmentRoleId,
    isActive: target.isActive,
  });
  const targetIsAdminNow = targetEffPriority >= ADMIN_PRIORITY_THRESHOLD;

  if (targetIsAdminNow && currentAdmins <= 1) {
    return {
      ok: false,
      message:
        "この部署の有効な管理者がこの1名のみのため削除できません。別の管理者を作成してから再試行してください。",
    };
  }

  // 5) 論理削除
  await prisma.user.update({
    where: { id: target.id },
    data: { deletedAt: new Date() },
  });

  return { ok: true };
}
