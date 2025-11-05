// src/app/(protected)/profile/email/verify/page.tsx（新規 or 置換：SSR）
// 既存 middleware.ts が /profile 配下を保護している前提。
// 未ログインなら middleware が / へリダイレクト、

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { verifyEmailChangeAction } from "@/app/_actions/profile/email-verify";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
// ★ 追加：SSRガード
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";

export const metadata: Metadata = {
  title: "メールアドレス変更の確認",
  description: "メール内の確認URLを検証して申請をVERIFIEDに進めます。",
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function Page({ searchParams }: Props) {
  // ★ ここで表示可否を判定（未ログイン/権限不足/未定義は内部でredirect）
  await guardHrefOrRedirect("/profile/email/verify", "/");

  const token = ((await searchParams).token ?? "").trim();
  const res = await verifyEmailChangeAction(token);
  if (!res.ok) {
    return (
      <Result ok={false} message={res.message ?? "検証に失敗しました。"} />
    );
  }

  return (
    <Result
      ok
      message="本人確認が完了しました。管理者の承認後にメールアドレスが切り替わります。"
    />
  );
}

// 簡易な結果表示（UIはお好みで）
function Result({ ok, message }: { ok: boolean; message: string }) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/profile">プロフィール</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/profile/email">
                  メールアドレスの変更
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>メールアドレス変更の本人確認</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="max-w-xl p-4 pt-0">
        <h1 className="mb-3 text-lg font-semibold">
          {ok
            ? "メールアドレス変更の本人確認完了"
            : "メールアドレス変更の本人確認エラー"}
        </h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </>
  );
}
