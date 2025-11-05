// src/lib/email/domain-allow.ts
import { prisma } from "@/lib/database";
import { toAsciiEmailSafe } from "@/lib/email/normalize";

/**
 * 部署の許可ドメインをチェック
 * - 部署に AllowedEmailDomain が 0 件なら無制限許可（true）
 * - 1 件以上ある場合、domainAscii のいずれかに等しい場合のみ許可
 */
export async function isDomainAllowed(
  departmentId: string,
  newEmailInput: string,
): Promise<boolean> {
  // 入力を punycode ASCII 化
  const asciiEmail = toAsciiEmailSafe(newEmailInput);

  // `@` が無効なら即NG
  const at = asciiEmail.lastIndexOf("@");
  if (at < 0) return false;
  const domainAscii = asciiEmail.slice(at + 1);

  // 部署ごとの許可ドメイン一覧を取得
  const list = await prisma.allowedEmailDomain.findMany({
    where: { departmentId, isActive: true },
    select: { domainAscii: true },
  });

  if (list.length === 0) {
    return true; // 無制限許可モード
  }

  // 許可ドメインと一致するか判定
  return list.some((r) => r.domainAscii === domainAscii);
}
