// src/lib/auth/guard.priority.ts
import type { MenuRecord } from "@/lib/sidebar/menu.schema";

export function computeRequiredPriority(
  start: MenuRecord,
  byId: Map<string, MenuRecord>,
): { required: number; chain: string[] } {
  let max = -Infinity;
  const chain: string[] = [];

  // cur は「次に見るノード」：存在しなければ while を抜ける
  let cur: MenuRecord | undefined = start;

  while (cur) {
    chain.push(cur.displayId);

    if (typeof cur.minPriority === "number") {
      max = Math.max(max, cur.minPriority);
    }

    // parentId は schema 上 `string | null`（undefined ではない）
    const parentId: string | null = cur.parentId;

    // ルート到達（親なし）
    if (parentId === null) break;

    // 次の親を引く（見つからなければ終了）
    const next: MenuRecord | undefined = byId.get(parentId);
    cur = next;
  }

  // どこにも minPriority が無ければ 0（全員可）
  const required = Number.isFinite(max) ? max : 0;
  return { required, chain };
}
