// src/lib/auth/user-snapshot.ts
import { prisma } from "@/lib/database";
import type { AuthUserSnapshot } from "./types";
import { getEffectiveRole } from "./effective-role";

/**
 * セッションで得られた userId から、Context 用の最小スナップショットを作る。
 * PII を最小化し、重い JOIN は避け、必要な列だけ select する。
 */
export async function getUserSnapshot(
  userId: string,
): Promise<AuthUserSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      departmentId: true,
      roleId: true,
      departmentRoleId: true,
      // 既存I/Fではロール権限はスナップショットに投影するので、
      // 「DB生のRole値」に依存せず、この後に「実効ロール」で上書きする。
    },
  });

  if (!user) return null;

  // 実効ロールを“内部で”合成（スナップショットI/Fには必要な値だけを反映）
  const eff = await getEffectiveRole(
    user.departmentRoleId
      ? {
          departmentId: user.departmentId,
          departmentRoleId: user.departmentRoleId,
        }
      : { departmentId: user.departmentId, roleId: user.roleId! },
  );
  if (!eff) return null;

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar ? `/avatar/${user.id}` : null,
    roleCode: eff.code, // ← 実効ロールの code を適用
    rolePriority: eff.priority, // ← 実効ロールの priority を適用
    canEditData: eff.canEditData, // ← 実効ロールの権限フラグを適用
    canDownloadData: eff.canDownloadData, // ← 実効ロールの権限フラグを適用
  };
}
