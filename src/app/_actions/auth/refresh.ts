// src/app/_actions/auth/refresh.ts
"use server";

import { lookupSessionFromCookie } from "@/lib/auth/session";
import { getUserSnapshot } from "@/lib/auth/user-snapshot";
import type { AuthUserSnapshot } from "@/lib/auth/types";

export type RefreshResult =
  | { ok: true; user: AuthUserSnapshot }
  | { ok: false; message: string };

export async function refreshAuthSnapshotAction(): Promise<RefreshResult> {
  const session = await lookupSessionFromCookie();
  if (!session.ok) return { ok: false, message: "認証が必要です" };

  const user = await getUserSnapshot(session.userId);
  if (!user) return { ok: false, message: "ユーザー情報の取得に失敗しました" };

  return { ok: true, user };
}
