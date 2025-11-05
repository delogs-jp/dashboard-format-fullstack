// src/lib/login/server-schema.ts
import { z } from "zod";
import { loginSchema } from "@/lib/login/schema";

/**
 * サーバ側では、(1) 正規化（trim/lowercase）と (2) サーバ限定ルール があれば“後付け”する。
 * - 形式チェックは loginSchema に委譲（DRY）
 * - パスワードは加工しない（ハッシュ照合に影響するため）
 */
export const loginServerSchema = loginSchema.transform((v) => ({
  ...v,
  accountId: v.accountId.trim(),
  email: v.email.trim(),
  // password は加工しない
}));

export type LoginServerInput = z.infer<typeof loginServerSchema>;
