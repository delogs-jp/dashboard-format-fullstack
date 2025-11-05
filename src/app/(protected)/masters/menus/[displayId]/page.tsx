// src/app/(protected)/masters/menus/[displayId]/page.tsx
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
import { getMenuByDisplayId, getParentOptions } from "@/lib/sidebar/menu.mock";
import type { ParentOption, IconOption } from "@/components/menus/menu-form";
import { ICONS } from "@/lib/sidebar/icons.map";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ displayId: string }>;
};

export const metadata: Metadata = {
  title: "メニュー編集",
  description: "サイドバーメニューを編集（UIのみ：モックストアへ保存）",
};

export default async function Page({ params }: Props) {
  const { displayId } = await params;
  // ★ ここで表示可否を判定（未ログイン/権限不足/未定義は内部でredirect）
  await guardHrefOrRedirect(`/masters/menus/${displayId}`, "/");

  // 対象取得（なければ 404）
  const rec = getMenuByDisplayId(displayId);
  if (!rec) notFound();

  // 親候補とアイコン候補
  const parentOptions: ParentOption[] = getParentOptions();
  const iconOptions: IconOption[] = Object.keys(ICONS)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => ({ value: k, label: k }));

  // RHF 既定に合わせて initialValues を準備
  const initialValues = {
    displayId: rec.displayId,
    parentId: rec.parentId,
    order: rec.order,
    title: rec.title,
    isSection: rec.isSection,
    href: rec.href ?? "",
    match: rec.match ?? "prefix",
    pattern: rec.pattern ?? "",
    iconName: rec.iconName ?? undefined,
    minPriority:
      rec.minPriority === null || rec.minPriority === undefined
        ? undefined
        : rec.minPriority,
    isActive: rec.isActive,
    hidden: rec.hidden,
  };

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
                <BreadcrumbPage>編集</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="max-w-2xl p-4 pt-0">
        <Client
          initialValues={initialValues}
          parentOptions={parentOptions}
          iconOptions={iconOptions}
        />
      </div>
    </>
  );
}
