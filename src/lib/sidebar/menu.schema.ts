// src/lib/sidebar/menu.schema.ts
import { z } from "zod";
import type { LucideIcon } from "lucide-react";

/** どのルールでURL一致を判定するか */
export type MatchMode = "exact" | "prefix" | "regex";

/** 1つのメニュー要素（ツリーの節） */
export type MenuNode = {
  /** 安定したキー（href が変わっても差分検知しやすくするなら独立ID推奨） */
  id: string;
  /** ラベル（サイドバーに表示） */
  title: string;
  /** 対応するURL（絶対パス。トレーリングスラッシュは付けない） */
  href?: string;
  /** アイコン（任意） */
  icon?: LucideIcon;
  /**
   * URLの一致方法：
   * - "exact": 完全一致（例 /users と /users だけ一致）
   * - "prefix": 前方一致（例 /users 配下すべて）
   * - "regex": 正規表現で高度な一致（必要時のみ）
   *
   * 指定がなければ "prefix" を既定とするのが実務的です。
   */
  match?: MatchMode;
  /** match === "regex" のときに使うパターン（未使用なら省略） */
  pattern?: RegExp;
  /** 子ノード（グループやサブメニュー） */
  children?: MenuNode[];
};

/** ツリー全体 */
export type MenuTree = MenuNode[];

/** 編集用の1レコード（UI専用） */
export const menuRecordSchema = z
  .object({
    displayId: z.string().min(1),
    parentId: z.string().nullable(),
    order: z.number().int().nonnegative(),
    title: z.string().min(1),
    href: z
      .string()
      .regex(/^\/(?!.*\/$).*/, "先頭は /、末尾スラッシュは不可")
      .optional(),
    iconName: z.string().optional(),
    match: z.enum(["exact", "prefix", "regex"]).default("prefix"),
    pattern: z.string().optional(),
    minPriority: z.number().int().positive().optional(),
    isSection: z.boolean().default(false),
    isActive: z.boolean(),
    // ★ 追加: ナビには出さないが RBAC 判定には使いたい時に true
    hidden: z.boolean().default(false),
    lockHiddenOverride: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    // 見出しノードのときはリンク関連を禁止
    if (val.isSection) {
      if (val.href) {
        ctx.addIssue({ code: "custom", message: "セクションではhref不要です" });
      }
      if (val.pattern) {
        ctx.addIssue({
          code: "custom",
          message: "セクションではpattern不要です",
        });
      }
    }

    // regex指定時は pattern 必須
    if (val.match === "regex" && !val.pattern) {
      ctx.addIssue({ code: "custom", message: "regex指定時はpattern必須です" });
    }

    // regex以外では pattern を禁止
    if (val.match !== "regex" && val.pattern) {
      ctx.addIssue({ code: "custom", message: "regex以外でpattern不要です" });
    }
  });

export type MenuRecord = z.infer<typeof menuRecordSchema>;

// Create: 新規登録時に入力させる項目だけを許容（displayId/order は自動）
export const menuCreateSchema = z
  .object({
    parentId: z.string().nullable(),
    title: z.string().min(1, "タイトルは必須です"),
    isSection: z.boolean().default(false),
    href: z
      .string()
      .regex(/^\/(?!.*\/$).*/, "先頭は /、末尾スラッシュは不可")
      .optional(),
    match: z.enum(["exact", "prefix", "regex"]).default("prefix"),
    // 「詳細設定」想定：regex のときだけ pattern を入れられる
    pattern: z.string().optional(),
    iconName: z.string().optional(),
    // 未選択＝全員表示。入力では string/number/空文字を受けて number | undefined に正規化
    minPriority: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
    isActive: z.boolean().default(true),
    // ★ 追加: 作成フォームからも hidden を設定可能に
    hidden: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    // ★ 見出しではリンク系禁止（既存）
    if (val.isSection) {
      if (val.href)
        ctx.addIssue({
          code: "custom",
          message: "見出しでは href は不要です",
          path: ["href"],
        });
      if (val.pattern)
        ctx.addIssue({
          code: "custom",
          message: "見出しでは pattern は不要です",
          path: ["pattern"],
        });
    }
    // ★ 見出しOFFのときは親が必須（= (ルート) は候補に出さない & null禁止）
    if (!val.isSection && !val.parentId) {
      ctx.addIssue({
        code: "custom",
        message: "親メニューを選択してください",
        path: ["parentId"],
      });
    }
    // regex の相関（既存）
    if (!val.isSection && val.match === "regex" && !val.pattern) {
      ctx.addIssue({
        code: "custom",
        message: "regex 指定時は pattern が必要です",
        path: ["pattern"],
      });
    }
    if (val.match !== "regex" && val.pattern) {
      ctx.addIssue({
        code: "custom",
        message: "regex 以外では pattern は不要です",
        path: ["pattern"],
      });
    }
  });

export type MenuCreateInput = z.input<typeof menuCreateSchema>;
export type MenuCreateValues = z.output<typeof menuCreateSchema>;

// Update: 表示ID／order を含む（編集章で使用予定）
export const menuUpdateSchema = menuCreateSchema
  .extend({
    displayId: z.string().min(1),
    order: z.number().int().nonnegative(),
  })
  .superRefine((val, ctx) => {
    // Create と同じ相関を維持
    if (val.isSection) {
      if (val.href)
        ctx.addIssue({
          code: "custom",
          message: "見出しでは href は不要です",
          path: ["href"],
        });
      if (val.pattern)
        ctx.addIssue({
          code: "custom",
          message: "見出しでは pattern は不要です",
          path: ["pattern"],
        });
    }
    if (!val.isSection && !val.parentId) {
      ctx.addIssue({
        code: "custom",
        message: "親メニューを選択してください",
        path: ["parentId"],
      });
    }
    if (!val.isSection && val.match === "regex" && !val.pattern) {
      ctx.addIssue({
        code: "custom",
        message: "regex 指定時は pattern が必要です",
        path: ["pattern"],
      });
    }
    if (val.match !== "regex" && val.pattern) {
      ctx.addIssue({
        code: "custom",
        message: "regex 以外では pattern は不要です",
        path: ["pattern"],
      });
    }
  });

export type MenuUpdateInput = z.input<typeof menuUpdateSchema>;
export type MenuUpdateValues = z.output<typeof menuUpdateSchema>;
