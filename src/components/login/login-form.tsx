// src/components/login/login-form.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useMemo } from "react"; // useMemoを追加
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/login/schema";
import { loginAction } from "@/app/_actions/auth/login";
import { useAuth } from "@/lib/auth/context";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

type LoginValues = z.infer<typeof loginSchema>;

// 追加：同一オリジン・アプリ内パスのみOKにする簡易サニタイズ
function resolveNext(continueTo?: string): string {
  if (!continueTo) return "/dashboard";
  try {
    // フルURLで来ても弾く（プロトコル/ホストを含むのはNG）
    // 先頭が "/" で始まり、"//" ではなく、":" を含まない（スキーム禁止）パスだけ許可
    if (
      continueTo.startsWith("/") &&
      !continueTo.startsWith("//") &&
      !continueTo.includes(":")
    ) {
      return continueTo;
    }
  } catch {
    /* noop */
  }
  return "/dashboard";
}

export default function LoginForm({ continueTo }: { continueTo?: string }) {
  const [pending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { setUser } = useAuth(); // 追加 ★ Context API
  const router = useRouter(); // 追加

  // 追加：メモ化（不要なら毎回 resolveNext でもOK）
  const nextUrl = useMemo(() => resolveNext(continueTo), [continueTo]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { accountId: "", email: "", password: "" },
    mode: "onSubmit", // 不正ログインを誘発しないように曖昧なエラーメッセージ onBlur などに変更すれば普通のバリデーションになる
  });

  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (values: LoginValues) => {
    setGlobalError(null);

    // 送信中の2重送信防止（任意）
    if (pending) return;

    startTransition(async () => {
      // サーバアクション呼び出し
      const res = await loginAction({
        accountId: values.accountId,
        email: values.email,
        password: values.password,
      });

      if (!res || !("ok" in res)) {
        setGlobalError(
          "予期せぬエラーが発生しました。時間をおいて再試行してください。",
        );
        return;
      }

      if (!res.ok) {
        // 項目別エラーを formState に注入（既存の <FormMessage /> が拾う）
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            // message が undefined の場合でも空文字は避ける
            if (message) {
              form.setError(field as keyof LoginValues, {
                type: "server",
                message,
              });
            }
          }
        }
        // 全体エラー（ロック/曖昧メッセージなど）はグローバルに表示
        if (res.message) setGlobalError(res.message);
        return;
      }

      // 追加： ★ 成功時：Contextに保存してから遷移
      setUser(res.user);
      // ここを "/dashboard" 固定から、continue対応に変更
      router.replace(nextUrl);
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="mx-auto max-w-md space-y-4 pt-4 pb-10"
      >
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>アカウントID</FormLabel>
              <FormControl>
                <Input
                  data-testid="accountId"
                  placeholder="CoRP000123456"
                  autoFocus
                  aria-invalid={!!form.formState.errors.accountId}
                  disabled={pending}
                  {...field}
                />
              </FormControl>
              <FormMessage data-testid="accountId-error" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input
                  data-testid="email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  aria-invalid={!!form.formState.errors.email}
                  disabled={pending}
                  {...field}
                />
              </FormControl>
              <FormMessage data-testid="email-error" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>パスワード</FormLabel>
              <div className="flex items-start gap-2">
                <FormControl>
                  <Input
                    {...field}
                    data-testid="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="半角英数字15文字以上"
                    aria-invalid={!!form.formState.errors.password}
                    disabled={pending}
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
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
              <FormMessage data-testid="password-error" />
            </FormItem>
          )}
        />
        {/* グローバルメッセージ（ロック/曖昧メッセージなど） */}
        {globalError && (
          <p className="mt-2 text-sm text-red-500" data-testid="global-error">
            {globalError}
          </p>
        )}

        <Button
          data-testid="submit"
          type="submit"
          className="mt-4 w-full cursor-pointer"
          disabled={pending}
        >
          {pending ? "ログイン中..." : "ログイン"}
        </Button>
      </form>
    </Form>
  );
}
