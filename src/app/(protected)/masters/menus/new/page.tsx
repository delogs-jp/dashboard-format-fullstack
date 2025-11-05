// src/app/(protected)/masters/menus/new/page.tsx
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
import { getParentOptions } from "@/lib/sidebar/menu.mock";
import type { ParentOption, IconOption } from "@/components/menus/menu-form";
import { ICONS } from "@/lib/sidebar/icons.map";

export const metadata: Metadata = {
  title: "メニュー新規登録",
  description: "サイドバーメニューを新規作成（UIのみ：モックストアへ保存）",
};

export default async function Page() {
  // ★ ここで表示可否を判定（未ログイン/権限不足/未定義は内部でredirect）
  await guardHrefOrRedirect("/masters/menus/new", "/");

  // 親候補（(ルート) + 既存メニュー）
  const parentOptions: ParentOption[] = getParentOptions();

  // アイコン候補（ICONS のキーを列挙）
  const iconOptions: IconOption[] = Object.keys(ICONS)
    .sort((a, b) => a.localeCompare(b)) // UX: アルファベット順に
    .map((k) => ({ value: k, label: k }));

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
                <BreadcrumbLink href="/masters">マスタ管理</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/masters/menus">
                  メニュー管理
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>新規登録</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="max-w-2xl p-4 pt-0">
        <Client parentOptions={parentOptions} iconOptions={iconOptions} />
      </div>
    </>
  );
}
