// src/lib/auth/guard.util.ts
import type { MenuRecord } from "@/lib/sidebar/menu.schema";

/** 祖先URIを末尾から順に列挙（例: /a/b/c → ["/a/b/c", "/a/b", "/a", "/"]） */
export function enumerateAncestorHrefs(href: string): string[] {
  const parts = href.split("/").filter(Boolean); // 空要素除去
  const acc: string[] = [];
  for (let i = parts.length; i >= 0; i--) {
    const p = "/" + parts.slice(0, i).join("/");
    acc.push(p === "//" ? "/" : p);
  }
  return acc;
}

/** メニューの索引を作成 */
export function buildMenuIndex(records: MenuRecord[]) {
  const byId = new Map<string, MenuRecord>();
  const childrenByParentId = new Map<string | null, MenuRecord[]>();

  for (const r of records) {
    byId.set(r.displayId, r);
    const bucket = childrenByParentId.get(r.parentId) ?? [];
    bucket.push(r);
    childrenByParentId.set(r.parentId, bucket);
  }

  // 子を order で安定ソート（任意）
  for (const [k, arr] of childrenByParentId) {
    arr.sort((a, b) => a.order - b.order);
    childrenByParentId.set(k, arr);
  }

  return { byId, childrenByParentId };
}
