// src/app/(protected)/profile/page.tsx
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
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";
import { getMyProfileDetail } from "@/app/_actions/profile/get-profile-detail"; // 追加
import Client from "./client";

export const metadata: Metadata = {
  title: "プロフィール",
  description:
    "ユーザのプロフィール（氏名・アバター）を編集し、メール／パスワード変更画面へ遷移",
};

export default async function Page() {
  await guardHrefOrRedirect("/profile", "/");

  // ★ ここで実効ロールと電話番号取得
  const res = await getMyProfileDetail();
  if (!res.ok || !res.value) return null;

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
                <BreadcrumbPage>プロフィール編集</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* クライアントコンポーネントへ実効ロール等を提供 */}
      <div className="max-w-xl p-4 pt-0">
        <Client initial={res.value} />
      </div>
    </>
  );
}
