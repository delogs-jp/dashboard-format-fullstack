// src/app/_actions/menus/update.ts
"use server";

import { prisma } from "@/lib/database";
import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getEffectiveRole } from "@/lib/auth/effective-role";
import { revalidateMenusForDepartment } from "@/lib/sidebar/menu.fetch";

type ActionResult = { ok: true } | { ok: false; message: string };

// ADMIN 相当のしきい値（ユーザ更新と同基準）
const ADMIN_PRIORITY_THRESHOLD = 100;

/* ─────────────────────────────────────────────
   ユーティリティ
   ───────────────────────────────────────────── */

/** 呼び出しユーザの部署ID・実効ロールpriorityを取得し、ADMINか検証 */
async function requireAdminAndDepartment() {
  const ses = await lookupSessionFromCookie();
  if (!ses.ok) return { ok: false as const, message: "認証が必要です。" };

  const me = await prisma.user.findUnique({
    where: { id: ses.userId },
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

  if (!me.departmentId)
    return { ok: false as const, message: "部署が見つかりません。" };

  // 実効ロールのpriorityを解決
  let eff = null as null | { priority: number };
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

  return {
    ok: true as const,
    userId: me.id,
    departmentId: me.departmentId,
    priority: eff.priority,
  };
}

/** displayId → Menu（テンプレ） */
async function findMenuByDisplayId(displayId: string) {
  const m = await prisma.menu.findUnique({
    where: { displayId },
    select: {
      id: true,
      displayId: true,
      href: true,
      isActive: true, // テンプレが無効なら対象外
      parentId: true,
      sortOrder: true,
      lockHiddenOverride: true,
    },
  });
  if (!m) throw new Error(`Menu not found: ${displayId}`);
  return m;
}

/* ─────────────────────────────────────────────
   アクション: 可視(=hidden)の切替
   部署ごとの DepartmentMenu.hidden を true/false で上書き
   ───────────────────────────────────────────── */
export async function toggleMenuHiddenAction(
  displayId: string,
  nextHidden: boolean, // true=非表示, false=表示
): Promise<ActionResult> {
  const auth = await requireAdminAndDepartment();
  if (!auth.ok) return auth;

  const menu = await findMenuByDisplayId(displayId);
  if (!menu.isActive) {
    return { ok: false, message: "このメニューはテンプレート側で無効です。" };
  }
  // ★ ここで保護
  // ★ DB で制御：禁止されているなら拒否
  if (menu.lockHiddenOverride) {
    return { ok: false, message: "このメニューは非表示にできません。" };
  }
  // nextHidden=false → テンプレ既定(=可視)にもどす → hiddenOverride: null
  // nextHidden=true  → 非表示の明示 → hiddenOverride: true
  await prisma.departmentMenu.upsert({
    where: {
      departmentId_menuId: { departmentId: auth.departmentId, menuId: menu.id },
    },
    update: { hiddenOverride: nextHidden ? true : null },
    create: {
      departmentId: auth.departmentId,
      menuId: menu.id,
      hiddenOverride: nextHidden ? true : null,
    },
  });

  revalidateMenusForDepartment(auth.departmentId);
  return { ok: true };
}

/* ─────────────────────────────────────────────
   アクション: 兄弟間の順序入れ替え（↑/↓）
   DepartmentMenu.sortOrder をswap（無ければテンプレ値を基準に生成）
   ───────────────────────────────────────────── */
export async function moveMenuOrderAction(
  displayId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  // 1) 認証・権限
  const auth = await requireAdminAndDepartment();
  if (!auth.ok) return auth;

  // 2) 対象と兄弟一覧
  const me = await findMenuByDisplayId(displayId);
  if (!me.isActive) {
    return { ok: false, message: "このメニューはテンプレート側で無効です。" };
  }

  // 同一親・テンプレ isActive=true の兄弟だけが並び替え対象
  const siblings = await prisma.menu.findMany({
    where: { parentId: me.parentId, isActive: true },
    select: {
      id: true,
      displayId: true,
      sortOrder: true,
      departmentMenus: {
        where: { departmentId: auth.departmentId },
        select: { sortOrder: true },
        take: 1,
      },
    },
  });

  const list = siblings
    .map((s) => ({
      id: s.id,
      displayId: s.displayId,
      order: s.departmentMenus[0]?.sortOrder ?? s.sortOrder,
    }))
    .sort((a, b) => a.order - b.order);

  const idx = list.findIndex((x) => x.displayId === displayId);
  if (idx < 0) return { ok: false, message: "メニューが見つかりません。" };

  const pair = direction === "up" ? list[idx - 1] : list[idx + 1];
  if (!pair) return { ok: true }; // 端っこ：何もしない（エラーにしない）

  const a = list[idx];
  const b = pair;

  // 3) swap（2件トランザクション）
  await prisma.$transaction([
    prisma.departmentMenu.upsert({
      where: {
        departmentId_menuId: { departmentId: auth.departmentId, menuId: a.id },
      },
      update: { sortOrder: b.order },
      create: {
        departmentId: auth.departmentId,
        menuId: a.id,
        sortOrder: b.order,
      },
    }),
    prisma.departmentMenu.upsert({
      where: {
        departmentId_menuId: { departmentId: auth.departmentId, menuId: b.id },
      },
      update: { sortOrder: a.order },
      create: {
        departmentId: auth.departmentId,
        menuId: b.id,
        sortOrder: a.order,
      },
    }),
  ]);

  // 4) キャッシュ破棄
  revalidateMenusForDepartment(auth.departmentId);

  return { ok: true };
}
