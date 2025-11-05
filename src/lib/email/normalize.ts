// src/lib/email/normalize.ts（新規）
import * as punycode from "punycode/";

/**
 * 入力文字列を trim し、"@" 以降（ドメイン部）のみを toASCII する。
 * - 失敗時は元の文字列を返す（後段の z.email で invalid 判定）
 * - 大文字小文字は“変換の結果”に従い、そのまま保持（強制 toLowerCase はしない）
 */
export function toAsciiEmailSafe(input: string): string {
  const s = input.trim();
  const at = s.lastIndexOf("@");
  if (at === -1) return s; // 後段の z.email が invalid にする
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain) return s;
  try {
    return `${local}@${punycode.toASCII(domain)}`;
  } catch {
    return s;
  }
}
