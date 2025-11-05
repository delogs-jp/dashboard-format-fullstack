// src/app/(protected)/not-found.tsx
import { redirect } from "next/navigation"; // 追加
import { lookupSessionFromCookie } from "@/lib/auth/session"; // 追加

import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { FileWarning } from "lucide-react";
import NotFoundClient from "./_components/not-found-client";

// ページメタ（任意）。404はインデックス対象外なので簡素でOK。
export const metadata: Metadata = {
  title: "ページが見つかりません",
};

export default async function ProtectedNotFound() {
  const session = await lookupSessionFromCookie();
  if (!session.ok) {
    redirect("/"); // 未ログインはログインページ（/）へ
  }

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
              <BreadcrumbItem>
                <BreadcrumbPage>ページが見つかりません</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
        <FileWarning className="text-muted-foreground mx-auto h-12 w-12" />
        <div className="space-y-2">
          <p className="text-2xl font-bold">ページが見つかりません</p>
          <p className="text-muted-foreground">
            URLをご確認いただくか、サイドバーから目的のページを選択してください。
          </p>
        </div>
        {/* ルーター操作などクライアント挙動は子コンポーネントへ分離 */}
        <NotFoundClient />
      </div>
    </>
  );
}
