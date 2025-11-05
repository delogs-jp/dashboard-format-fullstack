// src/lib/auth/effective-role.ts
import "server-only";
import { prisma } from "@/lib/database";

export type EffectiveRole = {
  code: string; // 表示やロギングに使用（customはDR.code、override/roleIdのみはRole.code）
  name: string; // 表示名（override適用済み）
  priority: number; // ガード判定に使用
  badgeColor: string | null; // バッジ表示（override適用済み）
  canEditData: boolean; // 書き込み系ガード
  canDownloadData: boolean; // エクスポート系ガード
  isEnabledInDepartment: boolean; // 部署視点の使用可否（DRが無ければ true）
  source: "role" | "override" | "custom"; // どの経路で合成されたか
};

type Input =
  | { departmentId: string; roleId: string; departmentRoleId?: undefined }
  | { departmentId: string; roleId?: undefined; departmentRoleId: string };

/**
 * 実効ロール合成
 * - roleId のみ    : Role をベースに、あれば override の name/badge を適用
 * - departmentRole : custom なら DR 値、override なら Role 値 + name/badge 上書き
 */
export async function getEffectiveRole(
  input: Input,
): Promise<EffectiveRole | null> {
  const { departmentId } = input;

  if (input.departmentRoleId) {
    const dr = await prisma.departmentRole.findUnique({
      where: { id: input.departmentRoleId },
      select: {
        isEnabled: true,
        // custom 用
        code: true,
        name: true,
        priority: true,
        badgeColor: true,
        canDownloadData: true,
        canEditData: true,
        // override 用
        roleId: true,
        nameOverride: true,
        badgeColorOverride: true,
        // 参照 Role 情報
        role: {
          select: {
            code: true,
            name: true,
            priority: true,
            badgeColor: true,
            canDownloadData: true,
            canEditData: true,
          },
        },
      },
    });

    if (!dr) return null;

    // custom: roleId が NULL
    if (!dr.roleId) {
      // priority, can* は DR の値が必須（DB制約により存在）
      return {
        code: dr.code ?? "UNKNOWN",
        name: dr.name ?? "Unnamed",
        priority: dr.priority ?? 0,
        badgeColor: dr.badgeColor ?? null,
        canEditData: dr.canEditData ?? false,
        canDownloadData: dr.canDownloadData ?? false,
        isEnabledInDepartment: dr.isEnabled,
        source: "custom",
      };
    }

    // override: Role をベースに name/badge を上書き
    const r = dr.role;
    if (!r) return null;

    return {
      code: r.code,
      name: dr.nameOverride ?? r.name,
      priority: r.priority,
      badgeColor: dr.badgeColorOverride ?? r.badgeColor ?? null,
      canEditData: r.canEditData,
      canDownloadData: r.canDownloadData,
      isEnabledInDepartment: dr.isEnabled,
      source: "override",
    };
  }

  // roleId のみ
  if (input.roleId) {
    // Role を取得しつつ、同 department の override があれば1件拾う
    const r = await prisma.role.findUnique({
      where: { id: input.roleId },
      select: {
        code: true,
        name: true,
        priority: true,
        badgeColor: true,
        canDownloadData: true,
        canEditData: true,
        departmentRoles: {
          where: { departmentId, roleId: { not: null } },
          take: 1,
          select: {
            isEnabled: true,
            nameOverride: true,
            badgeColorOverride: true,
          },
        },
      },
    });
    if (!r) return null;

    const ov = r.departmentRoles[0]; // 0 or 1
    return {
      code: r.code,
      name: ov?.nameOverride ?? r.name,
      priority: r.priority,
      badgeColor: ov?.badgeColorOverride ?? r.badgeColor ?? null,
      canEditData: r.canEditData,
      canDownloadData: r.canDownloadData,
      isEnabledInDepartment: ov ? ov.isEnabled : true,
      source: ov ? "override" : "role",
    };
  }

  return null;
}
