// src/lib/auth/guard.core.ts
import type {
  AuthUserSnapshot,
  GuardDecision,
  GuardOptions,
} from "@/lib/auth/types";
import { buildMenuIndex, enumerateAncestorHrefs } from "./guard.util";
import { pickBestMatch } from "./guard.matcher";
import { computeRequiredPriority } from "./guard.priority";
import type { MenuRecord } from "@/lib/sidebar/menu.schema";
// ★ DBメニュー取得（部署別の合成済み MenuRecord[] を返す）
import { fetchMenusForDepartment } from "@/lib/sidebar/menu.fetch";

/** 内部共通：与えられた records を使って判定（純粋関数） */
function decideWithRecords(
  href: string,
  user: AuthUserSnapshot | null,
  records: MenuRecord[],
  options: GuardOptions,
): GuardDecision {
  if (!user) return { ok: false, reason: "UNAUTHORIZED" };

  const { byId } = buildMenuIndex(records);
  const best = pickBestMatch(records, href);

  if (!best) {
    if (options.strictNotFound) return { ok: false, reason: "NOT_FOUND" };
    // 将来拡張（現状は strict 想定）
    for (const a of enumerateAncestorHrefs(href).slice(1)) {
      const b = pickBestMatch(records, a);
      if (b) {
        const { required } = computeRequiredPriority(b, byId);
        return user.rolePriority >= required
          ? { ok: true, requiredPriority: required, matchedId: b.displayId }
          : { ok: false, reason: "FORBIDDEN" };
      }
    }
    return { ok: false, reason: "NOT_FOUND" };
  }

  const { required } = computeRequiredPriority(best, byId);
  if (user.rolePriority >= required) {
    return { ok: true, requiredPriority: required, matchedId: best.displayId };
  }
  return { ok: false, reason: "FORBIDDEN" };
}

export function decideGuard(
  href: string,
  user: AuthUserSnapshot | null,
  options: GuardOptions = { strictNotFound: true },
): GuardDecision {
  // 旧：INITIAL_MENU_RECORDS を使っていたが、モックは廃止方向。
  // 互換のため空配列で NOT_FOUND を返すだけの形に退避させても良いが、
  // 既存呼び出しは guardHrefOrRedirect 側で置換するため未使用想定。
  return decideWithRecords(href, user, [], options);
}

/**
 * ガード判定のエントリポイント
 * @param href ページの絶対パス（例: "/users/new"）
 * @param user 認証済みユーザ（未ログインなら null）
 * @param options B案（未定義は拒否）を strict に適用するか
 */
/** ★ 新規（本命）：部署別DBメニューで判定 */
export async function decideGuardAsync(
  href: string,
  user: AuthUserSnapshot | null,
  departmentId: string,
  options: GuardOptions = { strictNotFound: true },
): Promise<GuardDecision> {
  if (!user) return { ok: false, reason: "UNAUTHORIZED" };
  const records = await fetchMenusForDepartment(departmentId);
  return decideWithRecords(href, user, records, options);
}
