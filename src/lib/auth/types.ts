// src/lib/auth/types.ts
export type AuthUserSnapshot = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roleCode: string; // ← Prisma の Role.code に一致
  rolePriority: number;
  // ★ 追加：ページ内部の機能制御フラグ（表示可否とは無関係）
  canEditData: boolean;
  canDownloadData: boolean;
};

export type AuthContextValue = {
  ready: boolean; // 初期化済みか
  user: AuthUserSnapshot | null; // 未ログイン時は null
  setUser: (user: AuthUserSnapshot | null) => void; // ログイン／ログアウトなどのクライアント操作から呼べるように
  // 将来用：再同期フロー（ロール変更を反映したい等）
  refresh?: () => Promise<void>;
};

export type GuardDecision =
  | { ok: true; requiredPriority: number; matchedId: string | null }
  | { ok: false; reason: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" };

export type MatchKind = "exact" | "prefix" | "regex";

export type GuardOptions = {
  /**
   * true の場合は「未定義URI」を NOT_FOUND にする（B案の強制）。
   * false の場合は「/users → /」のようにパス祖先での探索も試みる（将来拡張用）。
   */
  strictNotFound: boolean;
};
