// src/components/users/user-form.tsx
"use client";

import * as React from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form"; // useWatch を追加
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, EyeOff } from "lucide-react";

import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateValues,
  type UserUpdateValues,
  NAME_MAX,
  PASSWORD_MIN,
} from "@/lib/users/schema";

import { generatePassword } from "@/lib/security/password";
import type { AssignableRoleOption } from "@/app/_actions/department-roles/get-assignable-roles";

/* =========================
   公開インターフェース（型）
   ========================= */

type BaseProps = {
  roleOptions: AssignableRoleOption[];
  onCancel?: () => void;
  onDelete?: () => void;
};

type CreateProps = BaseProps & {
  mode: "create";
  // ★ 追加：XOR 引き渡し用
  onSubmitWithRole?: (
    values: UserCreateValues,
    selectedRole: string | null,
    selectedRoleLabel: string | null,
  ) => void;
  initialValues?: never;
};

type EditProps = BaseProps & {
  mode: "edit";
  onSubmit: (values: UserUpdateValues) => void;
  initialValues: UserUpdateValues;
};

type Props = CreateProps | EditProps;

/* =========================
   エクスポート本体
   ========================= */

export default function UserForm(props: Props) {
  return props.mode === "create" ? (
    <CreateForm {...props} />
  ) : (
    <EditForm {...props} />
  );
}

/* =========================
   Create（新規）フォーム
   ========================= */

function CreateForm({ roleOptions, onSubmitWithRole, onCancel }: CreateProps) {
  const form = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      isActive: true,
      phone: "",
      remarks: "",
      roleCode: "", // ★ XOR 文字列を直接持つ
    },
    mode: "onBlur",
  });

  // ★ 追加：選択中のロール（"role:<id>" | "dr:<id>"）
  const roleCode = useWatch({ control: form.control, name: "roleCode" });
  const selectedLabel =
    roleOptions.find((o) => o.value === roleCode)?.label ?? null;

  const handleSubmit = form.handleSubmit((values) => {
    if (onSubmitWithRole) {
      // トースト用にラベルだけ補助で渡す（生の値は values.roleCode に入っている）
      onSubmitWithRole(values, values.roleCode || null, selectedLabel);
    } else {
      // onSubmit を使う構成ならここで values をそのまま渡す
      // onSubmit?.(values);
      console.warn("onSubmitWithRole が未指定です");
    }
  });

  return (
    <Form {...form}>
      <form data-testid="user-form-create" onSubmit={handleSubmit}>
        <Card className="w-full rounded-md">
          <CardContent className="space-y-6 pt-1">
            <NameField />
            <EmailField />
            <RoleFieldXor roleOptions={roleOptions} />
            <PasswordField />
            <IsActiveField />
            <PhoneField /> {/* 追加 */}
            <RemarksField /> {/* 追加 */}
          </CardContent>

          <CardFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="cancel-btn"
              className="cursor-pointer"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              data-testid="submit-create"
              className="cursor-pointer"
              disabled={form.formState.isSubmitting}
            >
              登録する
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

/* =========================
   Edit（編集）フォーム
   ========================= */

function EditForm({
  roleOptions,
  onSubmit,
  onCancel,
  onDelete,
  initialValues,
}: EditProps) {
  const form = useForm<UserUpdateValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form data-testid="user-form-edit" onSubmit={handleSubmit}>
        <Card className="w-full rounded-md">
          <CardContent className="space-y-6 pt-1">
            <DisplayIdField />
            <Separator />
            <NameField />
            <EmailField />
            {/* ★ ここを XOR セレクトに統一 */}
            <RoleFieldXor roleOptions={roleOptions} />
            <IsActiveField />
            <PhoneField /> {/* 追加 */}
            <RemarksField /> {/* 追加 */}
          </CardContent>

          <CardFooter className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="cancel-btn"
                className="cursor-pointer"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                data-testid="submit-update"
                className="cursor-pointer"
                disabled={form.formState.isSubmitting}
              >
                更新する
              </Button>
            </div>
            {/* onDelete が渡っている時だけ表示 */}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    data-testid="delete-open"
                    className="cursor-pointer"
                  >
                    削除する
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ユーザを論理削除しますか？
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      この操作は DB では <code>deletedAt</code>{" "}
                      を設定する「論理削除」です。
                      一覧からは非表示になります（復活は別途機能で対応）。
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="delete-cancel">
                      キャンセル
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      data-testid="delete-confirm"
                    >
                      削除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

/* =========================
   小さなフィールド群（同ファイル内）
   - RHF の form は Form コンポーネントから context 供給済み
   - FormField は useForm の control を内部取得
   ========================= */

// 氏名
function NameField() {
  return (
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">氏名&nbsp;*</FormLabel>
          <FormControl>
            <Input
              {...field}
              inputMode="text"
              placeholder="山田 太郎"
              maxLength={NAME_MAX}
              aria-label="氏名"
              autoComplete="off"
              data-testid="name"
            />
          </FormControl>
          <FormMessage data-testid="name-error" />
        </FormItem>
      )}
    />
  );
}

// メール
function EmailField() {
  return (
    <FormField
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">メールアドレス&nbsp;*</FormLabel>
          <FormControl>
            <Input
              type="email"
              {...field}
              placeholder="user@example.com"
              aria-label="メールアドレス"
              autoComplete="off"
              data-testid="email"
            />
          </FormControl>
          <FormMessage data-testid="email-error" />
        </FormItem>
      )}
    />
  );
}

// パスワード（新規のみ・表示/非表示トグル付き）
function PasswordField() {
  const [showPassword, setShowPassword] = React.useState(false);
  const form = useFormContext(); // RHFのcontextから setValue/getValues を取得
  return (
    <FormField
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">パスワード&nbsp;*</FormLabel>
          <div className="flex items-start gap-2">
            <FormControl>
              <Input
                {...field}
                data-testid="password"
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                placeholder={`${PASSWORD_MIN}文字以上（英大/小/数字を含む）`}
                aria-label="パスワード"
              />
            </FormControl>

            <Button
              data-testid="password-toggle"
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword
                  ? "パスワードを非表示にする"
                  : "パスワードを表示する"
              }
              className="shrink-0 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>

            {/* 追加：生成ボタン */}
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                const pw = generatePassword(20);
                form.setValue("password", pw, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
              data-testid="password-generate"
            >
              自動生成
            </Button>
          </div>
          <FormMessage data-testid="password-error" />
        </FormItem>
      )}
    />
  );
}

// 有効フラグ
function IsActiveField() {
  return (
    <FormField
      name="isActive"
      render={({ field }) => (
        <FormItem className="mt-4 flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
          <div className="space-y-0.5">
            <FormLabel className="font-semibold">有効&nbsp;*</FormLabel>
            <FormDescription>
              ONにすると有効/OFFにすると無効になります
            </FormDescription>
          </div>
          <FormControl>
            <Switch
              name={field.name}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              aria-label="有効フラグ"
              data-testid="isActive"
            />
          </FormControl>
          <FormMessage data-testid="isActive-error" />
        </FormItem>
      )}
    />
  );
}

// 表示ID（編集のみ・読み取り専用）
function DisplayIdField() {
  return (
    <FormField
      name="displayId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>表示ID</FormLabel>
          <FormControl>
            <Input
              {...field}
              readOnly
              aria-readonly="true"
              data-testid="displayId"
              className="text-muted-foreground bg-muted border-none focus-visible:ring-0"
            />
          </FormControl>
          <FormDescription data-testid="displayId-desc">
            DBで自動採番される表示用IDです（編集不可）。
          </FormDescription>
          <FormMessage data-testid="displayId-error" />
        </FormItem>
      )}
    />
  );
}

// 電話番号
function PhoneField() {
  return (
    <FormField
      name="phone"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">電話番号</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder="090-xxxx-xxxx"
              aria-label="電話番号"
              autoComplete="off"
              data-testid="phone"
            />
          </FormControl>
          <FormMessage data-testid="phone-error" />
        </FormItem>
      )}
    />
  );
}

// 備考
function RemarksField() {
  return (
    <FormField
      name="remarks"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">備考</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder="メモなど"
              aria-label="備考"
              data-testid="remarks"
            />
          </FormControl>
          <FormMessage data-testid="remarks-error" />
        </FormItem>
      )}
    />
  );
}

// XOR 単一セレクト：roleCode に直バインド
function RoleFieldXor({
  roleOptions,
}: {
  roleOptions: AssignableRoleOption[];
}) {
  return (
    <FormField
      name="roleCode"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-semibold">ロール *</FormLabel>
          <Select
            value={field.value ?? ""}
            onValueChange={(v) => field.onChange(v)}
          >
            <FormControl>
              <SelectTrigger
                aria-label="ロールを選択"
                data-testid="role-trigger"
              >
                <SelectValue
                  placeholder="選択してください"
                  data-testid="role-value"
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent data-testid="role-list">
              {roleOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage data-testid="roleCode-error" />
        </FormItem>
      )}
    />
  );
}
