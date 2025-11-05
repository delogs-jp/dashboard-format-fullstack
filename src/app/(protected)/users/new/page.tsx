// src/app/(protected)/users/new/page.tsx
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
import Client from "./client";
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";
// ★ 2章で用意した候補を使用
import { getAssignableRolesAction } from "@/app/_actions/department-roles/get-assignable-roles";

export const metadata: Metadata = {
  title: "ユーザ新規登録",
  description:
    "共通フォーム（shadcn/ui + React Hook Form + Zod）でユーザを新規作成",
};

export default async function Page() {
  await guardHrefOrRedirect("/users/new", "/");

  // priority 昇順・disabled 反映済みの options を取得
  const res = await getAssignableRolesAction();
  if (!res.ok) {
    // 権限不足などは任意ハンドリング（本稿では単純に 403 相当）
    throw new Error(res.message || "Forbidden");
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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/users">ユーザ管理</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>ユーザ新規登録</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="max-w-xl p-4 pt-0">
        {/* 単一セレクトにそのまま流し込める形 */}
        <Client roleOptions={res.options} />
      </div>
    </>
  );
}
