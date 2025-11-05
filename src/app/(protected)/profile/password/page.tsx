// src/app/(protected)/profile/password/page.tsx（新規：SSR）

import type { Metadata } from "next";
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

import Client from "./client";

export const metadata: Metadata = {
  title: "パスワード変更",
  description:
    "本人のパスワード変更UI（現在のパスワードと新しいパスワードのみ）。",
};

export default async function Page() {
  // ★ ここで表示可否を判定（未ログイン/権限不足/未定義は内部でredirect）
  await guardHrefOrRedirect("/profile/password", "/");

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
              <BreadcrumbItem>
                <BreadcrumbPage>パスワード変更</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="max-w-xl p-4 pt-0">
        <Client />
      </div>
    </>
  );
}
