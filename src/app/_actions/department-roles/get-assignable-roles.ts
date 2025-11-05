// src/app/_actions/department-roles/get-assignable-roles.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getEffectiveRole } from "@/lib/auth/effective-role";

export type AssignableRoleOption = {
  value: string; // "role:<id>" | "dr:<id>"
  label: string; // 表示ラベル
  priority: number; // 並び替え用
  disabled?: boolean; // DRが無効な場合
};

export async function getAssignableRolesAction(): Promise<
  | { ok: true; options: AssignableRoleOption[]; departmentId: string }
  | { ok: false; message: string }
> {
  // 1) セッションとユーザー情報
  const s = await lookupSessionFromCookie();
  if (!s.ok) return { ok: false, message: "Unauthorized" };

  const me = await prisma.user.findUnique({
    where: { id: s.userId },
    select: {
      id: true,
      departmentId: true,
      roleId: true,
      departmentRoleId: true,
    },
  });
  if (!me) return { ok: false, message: "User not found" };

  // 2) ADMINガード
  let eff = null;
  if (me.departmentRoleId) {
    eff = await getEffectiveRole({
      departmentId: me.departmentId,
      departmentRoleId: me.departmentRoleId,
    });
  } else if (me.roleId) {
    eff = await getEffectiveRole({
      departmentId: me.departmentId,
      roleId: me.roleId, // non-null 分岐
    });
  } else {
    // XOR かつ両方 null は不正状態
    return { ok: false, message: "Forbidden" };
  }
  if (!eff || eff.priority < 100) {
    return { ok: false, message: "Forbidden" };
  }

  const departmentId = me.departmentId;

  // 3) Role と DepartmentRole を取得
  const [roles, droles] = await Promise.all([
    prisma.role.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, priority: true },
      orderBy: [{ priority: "asc" }, { code: "asc" }],
    }),
    prisma.departmentRole.findMany({
      where: { departmentId },
      select: {
        id: true,
        roleId: true, // ★ 追加：override 検出のために roleId を取得
        isEnabled: true,
        role: { select: { code: true, name: true, priority: true } },
        nameOverride: true,
        code: true,
        name: true,
        priority: true,
      },
    }),
  ]);

  // 4) override 対象の Role を候補から除外（isEnabled に関わらず除外）
  const overriddenRoleIds = new Set(
    droles
      .filter((dr) => dr.roleId) // override のみ抽出
      .map((dr) => dr.roleId as string), // roleId は非 null に確定
  );
  const rolesAfterFilter = roles.filter((r) => !overriddenRoleIds.has(r.id));

  // 5) Option 化
  const roleOpts: AssignableRoleOption[] = rolesAfterFilter.map((r) => ({
    value: `role:${r.id}`,
    label: `${r.name} （${r.code}）`,
    priority: r.priority,
  }));

  const drOpts: AssignableRoleOption[] = droles.map((dr) => {
    const isCustom = !dr.role;
    const label = isCustom
      ? `${dr.name ?? dr.code ?? "CUSTOM"} （${dr.code}）`
      : `${dr.nameOverride ?? dr.role!.name} （${dr.role!.code}）`;
    const prio = isCustom ? (dr.priority ?? 0) : dr.role!.priority;
    return {
      value: `dr:${dr.id}`,
      label,
      priority: prio,
      disabled: !dr.isEnabled,
    };
  });

  const options = [...roleOpts, ...drOpts].sort(
    (a, b) => a.priority - b.priority,
  );
  return { ok: true, options, departmentId };
}
