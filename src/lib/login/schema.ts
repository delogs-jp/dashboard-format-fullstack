// src/lib/login/schema.ts
import { z } from "zod";
//import * as punycode from "punycode/";
import { toAsciiEmailSafe } from "@/lib/email/normalize";

/*
function toAsciiEmailSafe(input: string) {
  const s = input.trim();
  const at = s.lastIndexOf("@");
  if (at === -1) return s; // 後段の z.email で弾かせる
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain) return s;
  try {
    return `${local}@${punycode.toASCII(domain)}`;
  } catch {
    // 不正なIDNなどはそのまま返して z.email で invalid に
    return s;
  }
}
*/
export const loginSchema = z.object({
  accountId: z
    .string()
    .min(15, "アカウントIDは15文字以上で入力してください。")
    .regex(/[A-Z]/, "大文字を1文字以上含めてください。")
    .regex(/[a-z]/, "小文字を1文字以上含めてください。")
    .regex(/[0-9]/, "数字を1文字以上含めてください。"),
  email: z
    .string()
    .transform((s) => toAsciiEmailSafe(s))
    .pipe(z.email("メールアドレスの形式が正しくありません")),
  password: z
    .string()
    .min(15, "パスワードは15文字以上で入力してください。")
    .regex(/[A-Z]/, "大文字を1文字以上含めてください。")
    .regex(/[a-z]/, "小文字を1文字以上含めてください。")
    .regex(/[0-9]/, "数字を1文字以上含めてください。"),
});
