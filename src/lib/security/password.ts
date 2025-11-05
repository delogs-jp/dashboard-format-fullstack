// src/lib/security/password.ts（パスワード生成：クライアントでも使えるユーティリティ）
export function generatePassword(length = 20): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{}:,./?";
  const all = upper + lower + digits + symbols;

  // 各種1文字は必ず含める
  const must = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  const rest = Array.from({ length: Math.max(0, length - must.length) }, () => {
    return all[Math.floor(Math.random() * all.length)];
  });
  const chars = [...must, ...rest];

  // シャッフル
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
