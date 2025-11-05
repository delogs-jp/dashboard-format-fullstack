// src/lib/sidebar/menu.rbac.ts
import type { MenuRecord } from "./menu.schema";

/**
 * 親の minPriority は子孫に “継承” され、子側での上書きは不可という仕様。
 * 有効値 = 親が持っていれば親の値、なければ自分の値（どちらも無ければ undefined）
 */
function inheritMinPriority(
  parentMin: number | undefined,
  selfMin: number | undefined,
): number | undefined {
  return parentMin ?? selfMin;
}

type Index = {
  byId: Map<string, MenuRecord>;
  childrenOf: Map<string | null, MenuRecord[]>;
};

function buildIndex(records: MenuRecord[]): Index {
  const byId = new Map<string, MenuRecord>();
  const childrenOf = new Map<string | null, MenuRecord[]>();

  for (const r of records) {
    byId.set(r.displayId, r);
    const key = r.parentId ?? null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(r);
    childrenOf.set(key, arr);
  }

  // 兄弟は order 順に
  for (const [, arr] of childrenOf) {
    arr.sort((a, b) => a.order - b.order);
  }

  return { byId, childrenOf };
}

/**
 * MenuRecord[] を rolePriority でフィルタし、空になった見出しは除去する。
 * - 非アクティブ（isActive=false）は常に除外
 * - 親が不可なら子孫も不可（自動的に落ちる）
 * - 見出し（isSection=true）は、最終的に子が 0 件なら除外
 */
export function filterMenuRecordsByPriority(
  records: MenuRecord[],
  userPriority: number,
): MenuRecord[] {
  const { childrenOf } = buildIndex(records);

  const kept: MenuRecord[] = [];
  const keptIds = new Set<string>();

  // 深さ優先：親 → 子へ “継承された minPriority” を渡しながら評価
  const walk = (parentId: string | null, inheritedMin: number | undefined) => {
    const children = childrenOf.get(parentId) ?? [];
    for (const rec of children) {
      if (!rec.isActive) continue;

      const effMin = inheritMinPriority(inheritedMin, rec.minPriority);
      const allowed = effMin == null || userPriority >= effMin;
      if (!allowed) continue;

      kept.push(rec);
      keptIds.add(rec.displayId);

      // 子孫へは “親の minPriority を優先継承”
      walk(rec.displayId, effMin);
    }
  };

  // ルートから開始
  walk(null, undefined);

  // 2 パス目：空見出し除去（子が一件も残っていない見出しは落とす）
  const hasChild = new Set<string>();
  for (const r of kept) {
    if (r.parentId && keptIds.has(r.parentId)) hasChild.add(r.parentId);
  }

  const pruned = kept.filter((r) =>
    r.isSection ? hasChild.has(r.displayId) : true,
  );

  // order の連番正規化（兄弟ごと）
  const byParent = new Map<string | null, MenuRecord[]>();
  for (const r of pruned) {
    const key = r.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(r);
    byParent.set(key, arr);
  }
  for (const [, arr] of byParent) {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((r, i) => (r.order = i));
  }

  return pruned;
}
