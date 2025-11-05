// src/lib/department-roles/schema.ts
import { z } from "zod";

/** 入力ルール（数字は定数化すると見直しやすい） */
export const DR_CODE_MAX = 50 as const;
export const DR_NAME_MAX = 100 as const;
export const DR_PRIORITY_MAX = 99 as const;
export const DR_REMARKS_MAX = 255 as const;

/** 共通フィールド定義（単一の定義に集約） */
const codeSchema = z
  .string()
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "大文字英字・数字・アンダースコアのみ使用できます",
  )
  .min(2, "2文字以上で入力してください")
  .max(DR_CODE_MAX, `${DR_CODE_MAX}文字以内で入力してください`);

const nameSchema = z
  .string()
  .min(1, "表示名を入力してください")
  .max(DR_NAME_MAX, `${DR_NAME_MAX}文字以内で入力してください`);

const prioritySchema = z.coerce
  .number()
  .int("整数で入力してください")
  .min(0, "0以上で入力してください")
  .max(DR_PRIORITY_MAX, `${DR_PRIORITY_MAX}以下で入力してください`);

const badgeColorSchema = z
  .string()
  .regex(
    /^#([0-9A-Fa-f]{6})$/,
    "カラーコードは #RRGGBB の形式で入力してください",
  )
  .optional();

const remarksSchema = z
  .string()
  .max(DR_REMARKS_MAX, `${DR_REMARKS_MAX}文字以内で入力してください`)
  .optional();

/** ── 新規（custom 固定）: roleId は扱わない ── */
export const departmentRoleCreateSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  priority: prioritySchema, // DB 側でも ≤99 を保証
  badgeColor: badgeColorSchema,
  isEnabled: z.boolean().default(true),
  canDownloadData: z.boolean(),
  canEditData: z.boolean(),
  remarks: remarksSchema,
});

/** Zod から型を派生（唯一の真実） */
export type DepartmentRoleCreateValues = z.infer<
  typeof departmentRoleCreateSchema
>;

/** 追加：RHF の「入力型」（coerce の前提で priority は unknown を許容） */
export type DepartmentRoleCreateInput = z.input<
  typeof departmentRoleCreateSchema
>;

/** ── 更新（識別ユニオン） ── */
const customEdit = z.object({
  kind: z.literal("custom"),
  displayId: z.string().min(1, "表示IDの取得に失敗しました"),
  code: codeSchema,
  name: nameSchema,
  priority: prioritySchema,
  badgeColor: badgeColorSchema,
  isEnabled: z.boolean(),
  canDownloadData: z.boolean(),
  canEditData: z.boolean(),
  remarks: remarksSchema,
});

const overrideEditExisting = z.object({
  kind: z.literal("override"),
  // 既存 override を編集する場合
  displayId: z.string().min(1, "表示IDの取得に失敗しました").optional(),
  // 初回（DRなし）の場合は Role 側の displayId を持つ
  roleDisplayId: z.string().min(1, "Role の表示IDが必要です").optional(),
  nameOverride: z.string().min(0).max(DR_NAME_MAX).optional(),
  badgeColorOverride: badgeColorSchema,
  isEnabled: z.boolean(),
});

export const departmentRoleUpdateSchema = z.union([
  customEdit,
  overrideEditExisting,
]);

export type DepartmentRoleUpdateValues = z.infer<
  typeof departmentRoleUpdateSchema
>;
export type DepartmentRoleUpdateInput = z.input<
  typeof departmentRoleUpdateSchema
>;
