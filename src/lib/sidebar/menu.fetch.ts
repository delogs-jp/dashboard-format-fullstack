// src/lib/sidebar/menu.fetch.ts
import "server-only";
import { prisma } from "@/lib/database";
import type { MatchMode, MenuRecord } from "@/lib/sidebar/menu.schema";
import { unstable_cache as unstableCache, revalidateTag } from "next/cache";

/** 再検証タグ（部署ごと） */
export const menusTagFor = (departmentId: string) =>
  `menus:dept:${departmentId}`;

/**
 * 部署ごとの DepartmentMenu 上書きを合成した MenuRecord[] を返す。
 * - 対象はテンプレート Menu.isActive = true のみ
 * - 上書き可能: isEnabled(=isActiveに反映) / hidden / sortOrder(=orderに反映)
 * - 親参照は displayId ベースに正規化して返却（既存UI互換）
 * - 取得結果は部署タグでキャッシュされ、更新時は revalidateTag(menusTagFor(dept)) で破棄
 */
export async function fetchMenusForDepartment(
  departmentId: string,
): Promise<MenuRecord[]> {
  // 動的キー/タグを使うため、呼び出しごとに cached 関数を生成して即実行
  const run = unstableCache(
    async (): Promise<MenuRecord[]> => {
      // ① 必要カラムのみ取得（親の displayId も同時取得）
      const rows = await prisma.menu.findMany({
        where: { isActive: true }, // テンプレ有効のみが候補
        select: {
          id: true,
          displayId: true,
          parentId: true,
          title: true,
          href: true,
          isExternal: true, // 将来用
          iconName: true,
          match: true, // Prisma enum: "exact" | "prefix" | "regex"
          pattern: true,
          minPriority: true,
          isSection: true,
          sortOrder: true,
          remarks: true,
          hidden: true,
          lockHiddenOverride: true,
          parent: { select: { displayId: true } }, // 親の displayId を取得
          departmentMenus: {
            where: { departmentId },
            select: {
              isEnabled: true,
              hiddenOverride: true,
              sortOrder: true,
            },
            take: 1,
          },
        },
        orderBy: [
          { parentId: "asc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      });

      // ② 合成（null/未設定はテンプレ既定を採用）
      const records: MenuRecord[] = rows.map((r) => {
        const ov = r.departmentMenus[0];
        const effectiveIsActive: boolean = ov?.isEnabled ?? true; // 未設定=有効
        const effectiveHidden: boolean = ov?.hiddenOverride ?? r.hidden;
        const effectiveOrder: number = ov?.sortOrder ?? r.sortOrder;

        const match: MatchMode = r.match as MatchMode;

        return {
          displayId: r.displayId,
          parentId: r.parent?.displayId ?? null, // 親は displayId で返す（UI互換）
          order: effectiveOrder,
          title: r.title,
          href: r.isSection ? undefined : (r.href ?? undefined),
          iconName: r.iconName ?? undefined,
          match,
          pattern: r.pattern ?? undefined,
          minPriority: r.minPriority ?? undefined,
          isSection: r.isSection,
          isActive: effectiveIsActive,
          hidden: effectiveHidden,
          lockHiddenOverride: r.lockHiddenOverride,
        };
      });

      return records;
    },
    // キャッシュキー（部署ごとに分離）
    ["menus", "dept", departmentId],
    // タグも部署ごと
    {
      tags: [menusTagFor(departmentId)],
      revalidate:
        process.env.NODE_ENV === "development" ? 30 : (false as 0 | false),
    },
  );

  return run();
}

/** 管理画面用：テンプレhidden=falseだけを対象に、部署上書きを合成して返す */
export async function fetchMenusForList(
  departmentId: string,
): Promise<MenuRecord[]> {
  const run = unstableCache(
    async (): Promise<MenuRecord[]> => {
      const rows = await prisma.menu.findMany({
        where: { isActive: true, hidden: false }, // ★テンプレhiddenをDBで除外
        select: {
          id: true,
          displayId: true,
          parentId: true,
          title: true,
          href: true,
          isExternal: true,
          iconName: true,
          match: true,
          pattern: true,
          minPriority: true,
          isSection: true,
          sortOrder: true,
          remarks: true,
          hidden: true, // ← ここは常に false（テンプレ値）
          lockHiddenOverride: true,
          parent: { select: { displayId: true } },
          departmentMenus: {
            where: { departmentId },
            select: {
              isEnabled: true,
              hiddenOverride: true,
              sortOrder: true,
            },
            take: 1,
          },
        },
        orderBy: [
          { parentId: "asc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      });

      return rows.map((r) => {
        const ov = r.departmentMenus[0];
        const effectiveIsActive = ov?.isEnabled ?? true;
        const effectiveHidden = ov?.hiddenOverride ?? false; // ← テンプレは常に false
        const effectiveOrder = ov?.sortOrder ?? r.sortOrder;

        return {
          displayId: r.displayId,
          parentId: r.parent?.displayId ?? null,
          order: effectiveOrder,
          title: r.title,
          href: r.isSection ? undefined : (r.href ?? undefined),
          iconName: r.iconName ?? undefined,
          match: r.match as MatchMode,
          pattern: r.pattern ?? undefined,
          minPriority: r.minPriority ?? undefined,
          isSection: r.isSection,
          isActive: effectiveIsActive,
          hidden: effectiveHidden,
          lockHiddenOverride: r.lockHiddenOverride,
        };
      });
    },
    ["menus:list", departmentId],
    {
      tags: [menusTagFor(departmentId)],
      revalidate:
        process.env.NODE_ENV === "development" ? 30 : (false as 0 | false),
    },
  );
  return run();
}

/** 変更系アクションから呼ぶ：該当部署のメニューキャッシュを破棄 */
export function revalidateMenusForDepartment(departmentId: string): void {
  revalidateTag(menusTagFor(departmentId));
}
