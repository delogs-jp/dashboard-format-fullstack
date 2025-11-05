// src/app/_actions/profile/get-profile-detail.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getEffectiveRole } from "@/lib/auth/effective-role";

export type MyProfileDetail = {
  name: string;
  email: string;
  phone: string | null;
  currentAvatarUrl: string | null;
  effectiveRoleName: string;
  effectiveBadgeColor: string | null;
};

export async function getMyProfileDetail() {
  const session = await lookupSessionFromCookie();
  if (!session.ok) return { ok: false, message: "未ログインです" };

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      departmentId: true,
      roleId: true,
      departmentRoleId: true,
    },
  });
  if (!me) return { ok: false, message: "ユーザーが見つかりません" };

  const eff = await getEffectiveRole(
    me.departmentRoleId
      ? { departmentId: me.departmentId, departmentRoleId: me.departmentRoleId }
      : { departmentId: me.departmentId, roleId: me.roleId! },
  );
  if (!eff) return { ok: false, message: "実効ロールの取得に失敗しました" };

  return {
    ok: true,
    value: {
      name: me.name,
      email: me.email,
      phone: me.phone ?? null,
      currentAvatarUrl: me.avatar ? `/avatar/${me.id}` : null,
      effectiveRoleName: eff.name,
      effectiveBadgeColor: eff.badgeColor ?? null,
    },
  };
}
