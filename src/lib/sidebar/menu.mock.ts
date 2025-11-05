// src/lib/sidebar/menu.mock.ts
// 初期データ（UI唯一ソース）：将来はAPIレスポンスに置き換え
import type { MenuRecord } from "./menu.schema";

export const INITIAL_MENU_RECORDS: MenuRecord[] = [];

// ストア本体とCRUD・並び替え・参照ユーティリティ
// ミュータブルなストア（UI操作で更新）
let store: MenuRecord[] = INITIAL_MENU_RECORDS.map((r) => ({ ...r }));

/** 参照：一覧（親→子→孫の順で安定ソート） */
export function getMenus(): MenuRecord[] {
  return store.slice().sort((a, b) => {
    const pa = a.parentId ?? "";
    const pb = b.parentId ?? "";
    return pa === pb ? a.order - b.order : pa.localeCompare(pb);
  });
}

/** 参照：1件取得 */
export function getMenuByDisplayId(displayId: string): MenuRecord | undefined {
  return store.find((r) => r.displayId === displayId);
}

/** 参照：子ノード一覧 */
export function getChildren(parentId: string | null): MenuRecord[] {
  return getMenus().filter((r) => r.parentId === parentId);
}

/** 参照：子が存在するか（削除ガード用） */
export function hasChildren(displayId: string): boolean {
  return store.some((r) => r.parentId === displayId);
}

/** 採番：次の表示ID（M00000001 形式） */
export function nextDisplayId(): string {
  const max = store
    .map((r) => Number(r.displayId.slice(1)))
    .reduce((acc, n) => Math.max(acc, n), 0);
  return `M${String(max + 1).padStart(8, "0")}`;
}

/** 追加：兄弟末尾に追加し order を付与 */
export function addMenu(
  input: Omit<MenuRecord, "displayId" | "order">,
): MenuRecord {
  const displayId = nextDisplayId();
  const siblings = store.filter((r) => r.parentId === input.parentId);
  const rec: MenuRecord = { ...input, displayId, order: siblings.length };
  store.push(rec);
  normalizeOrder(store);
  return rec;
}

/** 更新：存在すれば置換（親変更も可）。整合のため order 正規化 */
export function updateMenu(updated: MenuRecord): boolean {
  const i = store.findIndex((r) => r.displayId === updated.displayId);
  if (i === -1) return false;
  store[i] = { ...updated };
  normalizeOrder(store);
  return true;
}

/** 削除：子がいれば不可（UI側で警告表示を想定） */
export function deleteMenu(displayId: string): boolean {
  if (hasChildren(displayId)) return false;
  const i = store.findIndex((r) => r.displayId === displayId);
  if (i === -1) return false;
  store.splice(i, 1);
  normalizeOrder(store);
  return true;
}

/** 並び替え：兄弟内で ↑↓ を入れ替え */
export function swapOrder(displayId: string, dir: "up" | "down"): boolean {
  const me = getMenuByDisplayId(displayId);
  if (!me) return false;

  const siblings = store
    .filter((r) => r.parentId === me.parentId)
    .sort((a, b) => a.order - b.order);

  const idx = siblings.findIndex((s) => s.displayId === me.displayId);
  const targetIdx = dir === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= siblings.length) return false;

  const a = siblings[idx];
  const b = siblings[targetIdx];
  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;

  normalizeOrder(store);
  return true;
}

/** 兄弟ごとに order を 0..N へ正規化（欠番防止） */
export function normalizeOrder(list: MenuRecord[]): void {
  const byParent = new Map<string | null, MenuRecord[]>();
  for (const r of list) {
    const key = r.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(r);
    byParent.set(key, arr);
  }
  for (const [, arr] of byParent) {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((r, i) => (r.order = i));
  }
}

/** リセット（テストや開発用） */
export function resetMenus(next?: MenuRecord[]): void {
  store = next
    ? next.map((r) => ({ ...r }))
    : INITIAL_MENU_RECORDS.map((r) => ({ ...r }));
}

export type ParentOption = { value: string | null; label: string };

/**
 * 親セレクト用の候補を返す
 * - ルート: (ルート) を先頭で固定（value=null）
 * - それ以外: “各親の直下の子” だけを親の直後に並べる（孫は除外）
 * - 表示: 親はそのまま、子はインデント付き（例：　└ ラベル）
 */
export function getParentOptions(): ParentOption[] {
  const opts: ParentOption[] = [{ value: null, label: "(ルート)" }];
  const all = getMenus(); // parentId→order で安定している
  // 親IDごとにグルーピング
  const byParent = new Map<string | null, MenuRecord[]>();
  for (const r of all) {
    const key = r.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(r);
    byParent.set(key, arr);
  }
  // 親 → 直下の子（孫は出さない）
  const roots = byParent.get(null) ?? [];
  for (const parent of roots) {
    opts.push({ value: parent.displayId, label: parent.title });
    const children = byParent.get(parent.displayId) ?? [];
    for (const c of children) {
      opts.push({ value: c.displayId, label: `　└ ${c.title}` });
    }
  }
  return opts;
}
