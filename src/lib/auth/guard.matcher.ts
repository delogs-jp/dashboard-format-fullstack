// src/lib/auth/guard.matcher.ts
import type { MenuRecord } from "@/lib/sidebar/menu.schema";

type Candidate = {
  record: MenuRecord;
  kind: "exact" | "prefix" | "regex";
  score: number; // 長いほど高スコアにする
};

function regexSafe(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

/** URI に対する最良一致を選ぶ（hidden を含める・isActive=false は除外） */
export function pickBestMatch(
  records: MenuRecord[],
  href: string,
): MenuRecord | null {
  const active = records.filter((r) => r.isActive);
  const cands: Candidate[] = [];

  for (const r of active) {
    if (!r.href && r.match !== "regex") continue; // 見出し等
    if (r.match === "exact" && r.href === href) {
      cands.push({ record: r, kind: "exact", score: Number.MAX_SAFE_INTEGER });
      continue;
    }
    if (r.match === "prefix" && r.href && href.startsWith(r.href)) {
      cands.push({ record: r, kind: "prefix", score: r.href.length });
      continue;
    }
    if (r.match === "regex" && r.pattern) {
      const re = regexSafe(r.pattern);
      if (re && re.test(href)) {
        cands.push({ record: r, kind: "regex", score: r.pattern.length });
      }
    }
  }

  if (cands.length === 0) return null;

  // 種別優先: exact > prefix > regex。種別内は score（長さ）で降順
  const kindRank = { exact: 3, prefix: 2, regex: 1 } as const;
  cands.sort((a, b) => {
    const kr = kindRank[a.kind] - kindRank[b.kind];
    if (kr !== 0) return -kr;
    return b.score - a.score;
  });

  return cands[0].record;
}
