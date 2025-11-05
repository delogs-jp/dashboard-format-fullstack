// src/components/profile/profile-form.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  profileUpdateSchema,
  type ProfileUpdateValues,
  MAX_IMAGE_MB,
  IMAGE_MAX_PX,
  IMAGE_RECOMMENDED_PX,
} from "@/lib/users/schema";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/* =========================
   公開インターフェース
   ========================= */
export type ProfileInitial = {
  name: string;
  email: string;
  phone?: string; // 追加
  //  roleCode: Role["code"]; // 削除
  currentAvatarUrl?: string;
  effectiveRoleName: string;
  effectiveBadgeColor: string | null;
};

type Props = {
  initial: ProfileInitial;
  onSubmit: (values: ProfileUpdateValues) => void;
  onCancel?: () => void;
  onNavigateEmail: () => void;
  onNavigatePassword: () => void;
  onDelete: () => void; // ← 追加
};

/* =========================
   本体（純粋なフォームに）
   ========================= */
export default function ProfileForm({
  initial,
  onSubmit,
  onCancel,
  onNavigateEmail,
  onNavigatePassword,
  onDelete,
}: Props) {
  const form = useForm<ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: initial.name,
      avatarFile: undefined,
      phone: initial.phone, // 追加
    },
    mode: "onBlur",
  });

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // ピクセル検証：NGならメッセージ文字列を返す／OKなら null
  async function validateImagePixels(file: File): Promise<string | null> {
    try {
      const bmp = await createImageBitmap(file);
      const { width, height } = bmp;
      if (width > IMAGE_MAX_PX || height > IMAGE_MAX_PX) {
        return `画像サイズは最大 ${IMAGE_MAX_PX}×${IMAGE_MAX_PX} px までです（選択: ${width}×${height}）`;
      }
      // 推奨未満はエラーにしない（任意通知は別途）
      if (width < IMAGE_RECOMMENDED_PX || height < IMAGE_RECOMMENDED_PX) {
        // 任意: 情報トーストなどは client.tsx で
      }
      return null;
    } catch {
      return "画像の読み込みに失敗しました。別のファイルをお試しください。";
    }
  }

  const handleSubmit = form.handleSubmit(onSubmit);

  //const badge = getRoleBadgeProps(initial.roleCode);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} data-testid="profile-form">
        <Card className="w-full rounded-md">
          <CardHeader className="-mt-2 -mb-4">
            {/* 初期値を利用してラベル表示 */}
            <Badge
              className="ml-auto inline-block w-[85px] px-2 py-1 text-center"
              style={{
                backgroundColor: initial.effectiveBadgeColor ?? "#666",
                color: "#fff",
                border: "none",
              }}
            >
              {initial.effectiveRoleName}
            </Badge>
            {/*  削除 → <RoleBadgeRow label={badge.label} badgeStyle={badge.style} /> */}
          </CardHeader>

          <CardContent className="space-y-6 pt-1">
            <AvatarField
              currentAvatarUrl={initial.currentAvatarUrl}
              previewUrl={previewUrl}
              onPick={async (file) => {
                form.clearErrors("avatarFile");
                if (!file) {
                  form.setValue("avatarFile", undefined, { shouldDirty: true });
                  setPreviewUrl(null);
                  return;
                }
                const pixelError = await validateImagePixels(file);
                if (pixelError) {
                  form.setError("avatarFile", {
                    type: "validate",
                    message: pixelError,
                  });
                  form.setValue("avatarFile", undefined, { shouldDirty: true });
                  setPreviewUrl(null);
                  return;
                }
                form.setValue("avatarFile", file, {
                  shouldDirty: true,
                  shouldValidate: true, // zod の容量/拡張子チェックも走る
                });
                setPreviewUrl(URL.createObjectURL(file));
                void form.trigger("avatarFile");
              }}
              onClear={() => {
                form.setValue("avatarFile", undefined, { shouldDirty: true });
                form.clearErrors("avatarFile");
                setPreviewUrl(null);
              }}
              onDelete={onDelete} // ← ここで渡す
              footerMessage={<FormMessage data-testid="avatar-error" />}
            />
            <NameField />
            <PhoneField /> {/* ← 追加 */}
            <EmailRow email={initial.email} onNavigate={onNavigateEmail} />
            <PasswordRow onNavigate={onNavigatePassword} />
          </CardContent>

          <CardFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel ?? (() => history.back())}
              className="cursor-pointer"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={form.formState.isSubmitting}
            >
              更新する
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

/* =========================
   小さなフィールド群（同ファイル内）
   ========================= */

// アバター（内部で FormField を張る）
function AvatarField({
  currentAvatarUrl,
  previewUrl,
  onPick,
  onClear,
  onDelete, // ← 追加
  footerMessage,
}: {
  currentAvatarUrl?: string;
  previewUrl: string | null;
  onPick: (file: File | null) => void;
  onClear: () => void;
  onDelete: () => void; // ← 追加
  footerMessage?: React.ReactNode;
}) {
  const fileInputId = React.useId(); // ラベルとInput要素の紐づけのためID取得
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onFileInput = (file: File | null) => {
    onPick(file);
    if (fileRef.current) fileRef.current.value = ""; // 同一ファイルの再選択を許可
  };

  const handleOpen = () => fileRef.current?.click();

  return (
    <FormField
      name="avatarFile"
      render={() => (
        <FormItem>
          {/* fileInputIdを利用して、ラベルとinput要素を紐づけ */}
          <FormLabel htmlFor={fileInputId} className="font-semibold">
            アバター画像
          </FormLabel>

          <div className="flex items-start gap-4">
            <div className="size-16 min-w-16 overflow-hidden rounded-full border">
              {previewUrl || currentAvatarUrl ? (
                <Image
                  src={previewUrl ?? currentAvatarUrl!}
                  alt="アバターのプレビュー"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
                  No Image
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <input
                id={fileInputId} // ラベルとInput要素の紐づけ
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onFileInput(e.target.files?.[0] ?? null)}
                aria-label="アバター画像を選択"
                data-testid="avatar-file"
              />
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="cursor-pointer"
                    onClick={handleOpen}
                  >
                    画像を選択
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={onClear}
                    data-testid="avatar-clear"
                  >
                    クリア
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer"
                  onClick={onDelete}
                  data-testid="avatar-delete"
                >
                  登録画像を削除
                </Button>
              </div>

              {/* 制約の説明（情報） */}
              <p className="text-muted-foreground text-xs">
                画像は png / jpeg / webp / gif のいずれか。{MAX_IMAGE_MB}MB
                以下。 推奨サイズ：{IMAGE_RECOMMENDED_PX}px ×{" "}
                {IMAGE_RECOMMENDED_PX}px （最大：{IMAGE_MAX_PX}px ×{" "}
                {IMAGE_MAX_PX}px）
              </p>

              {/* Zod/RHF のエラー表示をここに集約 */}
              {footerMessage}
            </div>
          </div>
        </FormItem>
      )}
    />
  );
}

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
              maxLength={100}
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

// メール（表示のみ + 変更導線）
function EmailRow({
  email,
  onNavigate,
}: {
  email: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold">メールアドレス&nbsp;*</div>
        <div className="text-muted-foreground truncate text-sm" title={email}>
          {email}
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={onNavigate}
        className="cursor-pointer"
      >
        変更する
      </Button>
    </div>
  );
}

// パスワード（遷移のみ）
function PasswordRow({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <div className="text-sm font-semibold">パスワード&nbsp;*</div>
        <div className="text-muted-foreground text-sm">パスワードは非表示</div>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={onNavigate}
        className="cursor-pointer"
      >
        変更する
      </Button>
    </div>
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

/*
// ロール（バッジ表示のみ）
function RoleBadgeRow({
  label,
  badgeStyle,
}: {
  label: string;
  badgeStyle: React.CSSProperties;
}) {
  return (
    <div className="flex w-full justify-end">
      <Badge
        variant="outline"
        className="w-[85px] px-2 py-1"
        style={badgeStyle}
      >
        {label}
      </Badge>
    </div>
  );
}
*/
