// src/app/page.tsx
import Image from "next/image";
import Link from "next/link"; //追加
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import LoginForm from "@/components/login/login-form"; // ログインフォームコンポーネント
import { HandHelping } from "lucide-react"; //追加

type Props = { searchParams: Promise<{ continue?: string }> };

export default async function Page({ searchParams }: Props) {
  const next = ((await searchParams).continue ?? "").toString();
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-gray-800 p-6 md:p-10 dark:bg-neutral-800">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-end justify-between gap-2">
            {/* light用ロゴ（＝ダークモード時に非表示） */}
            <Image
              src="/logo.svg"
              alt="サイトロゴ"
              width={160}
              height={40}
              className="h-[40px] w-[160px] dark:hidden"
            />

            {/* dark用ロゴ（＝ダークモード時に表示） */}
            <Image
              src="/logo-d.svg"
              alt="サイトロゴ（ダーク）"
              width={160}
              height={40}
              className="hidden h-[40px] w-[160px] dark:block"
            />
            <div>
              <Badge variant="secondary" className="rounded-full">
                Demo
              </Badge>
              <Badge className="rounded-full" variant="outline">
                UI Only
              </Badge>
            </div>
          </CardTitle>
          <p className="text-muted-foreground mt-2 text-sm">
            デモ用のログインページのため、各項目はデフォルトでバリデーションを通る値を入れています。
          </p>
        </CardHeader>
        <CardContent className="-mt-4">
          <LoginForm continueTo={next} />
          {/* 追加： パスワード忘れの導線 */}
          <Link
            href="/password-forgot"
            className="my-2 ml-auto flex items-center justify-end gap-2 text-sm"
          >
            パスワードをお忘れの方
            <HandHelping />
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
