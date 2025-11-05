// src/lib/users/schema.ts
import { z } from "zod";
import { toAsciiEmailSafe } from "@/lib/email/normalize";

/** ── 入力ルール（数字はあとから見直しやすいよう定数化） ── */
export const NAME_MAX = 100 as const;
export const PASSWORD_MIN = 15 as const;
export const PASSWORD_MAX = 128 as const;

/** 追記：── アバター画像のクライアント検証（UIのみ） ── */
export const MAX_IMAGE_MB = 1 as const; // Slackをまねて軽量運用
export const IMAGE_MAX_PX = 1024 as const; // 最大許容ピクセル（UIで非同期チェック）
export const IMAGE_RECOMMENDED_PX = 512 as const;

/** 共通フィールドの最小ルール */
const nameSchema = z
  .string()
  .min(1, "氏名を入力してください")
  .max(NAME_MAX, `${NAME_MAX}文字以内で入力してください`);

// ★ 変更：transform + pipe で ASCII 化してから形式検証
export const emailSchema = z
  .string()
  .transform((s) => toAsciiEmailSafe(s))
  .pipe(z.email("メールアドレスの形式が正しくありません"));

// パスワード用
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `${PASSWORD_MIN}文字以上で入力してください`)
  .max(PASSWORD_MAX, `${PASSWORD_MAX}文字以内で入力してください`)
  .regex(/[A-Z]/, "大文字を1文字以上含めてください。")
  .regex(/[a-z]/, "小文字を1文字以上含めてください。")
  .regex(/[0-9]/, "数字を1文字以上含めてください。");

/** ★ 新規：単一セレクトの XOR 値を検証（"role:<uuid>" or "dr:<uuid>"） */
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const assignedRoleSchema = z
  .string()
  .min(1, "ロールを選択してください")
  .refine(
    (v) => v.startsWith("role:") || v.startsWith("dr:"),
    "ロールの指定が不正です",
  )
  .refine((v) => UUID_RE.test(v.split(":")[1] ?? ""), "ロールの指定が不正です");

const phoneSchema = z
  .string()
  .max(50, "50文字以内で入力してください")
  .optional();

const remarksSchema = z
  .string()
  .max(255, "255文字以内で入力してください")
  .optional();

/** ── 新規作成用：password が必須 ── */
export const userCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  roleCode: assignedRoleSchema,
  password: passwordSchema, // パスワード変更でも使うので共通化
  isActive: z.boolean(),
  phone: phoneSchema,
  remarks: remarksSchema,
});

/** ── 編集用：displayId を表示専用で扱い、password は扱わない ── */
export const userUpdateSchema = z.object({
  displayId: z.string().min(1, "表示IDの取得に失敗しました"),
  name: nameSchema,
  email: emailSchema,
  roleCode: assignedRoleSchema,
  isActive: z.boolean(),
  phone: phoneSchema,
  remarks: remarksSchema,
});

/** ── プロフィール（本人用）: displayId は UI に出さない。role は「表示のみ」 ── */
export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema, // 追加
  avatarFile: z
    .instanceof(File)
    .optional()
    .refine(
      (file) =>
        !file ||
        ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          file.type,
        ),
      "画像は png / jpeg / webp / gif のいずれかにしてください",
    )
    .refine(
      (file) => !file || file.size <= MAX_IMAGE_MB * 1024 * 1024,
      `画像サイズは ${MAX_IMAGE_MB}MB 以下にしてください`,
    ),
});

/** 追記：── プロフィール（本人用）のメール変更フォーム（本人用／確認メールを送るだけ） ── */
export const emailChangeSchema = (currentEmail: string) => {
  const currentAscii = toAsciiEmailSafe(currentEmail);

  return z.object({
    newEmail: z
      .string()
      .transform((s) => toAsciiEmailSafe(s)) // 入力直後に punycode 化
      .pipe(z.email("メールアドレスの形式が正しくありません")) // その結果を検証
      .refine(
        (v) => v !== currentAscii,
        "現在のメールアドレスと同じです。別のメールアドレスを入力してください",
      ),
  });
};

/** ── パスワード変更（本人） ─────────────────── */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: passwordSchema, // 共通化したものを利用,
});

// 追加: 共通で使い回すためエクスポート
export const accountIdSchema = z
  .string()
  .min(15, "アカウントIDは15文字以上で入力してください。")
  .regex(/[A-Z]/, "大文字を1文字以上含めてください。")
  .regex(/[a-z]/, "小文字を1文字以上含めてください。")
  .regex(/[0-9]/, "数字を1文字以上含めてください。");

/** ── Zod から型を派生（z.infer を使う） ── */
export type UserCreateValues = z.infer<typeof userCreateSchema>;
export type UserUpdateValues = z.infer<typeof userUpdateSchema>;
// 追記
export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;
// emailChangeSchema は「関数」なので ReturnType で返り値スキーマを取り出してから infer
export type EmailChangeValues = z.infer<ReturnType<typeof emailChangeSchema>>;
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
