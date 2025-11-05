// src/app/(protected)/masters/roles/new/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import Client from "./client";

export const metadata: Metadata = {
  title: "ロール新規登録（部署ローカル）",
  description:
    "部署ロール（DepartmentRole/custom）を新規作成。shadcn/ui + RHF + Zod + Server Action",
};

export default async function Page() {
  // ★ SSR ガードで viewer を取得
  const viewer = await guardHrefOrRedirect("/masters/roles/new", "/");

  // ★ 編集権限がなければ強制リダイレクト
  if (!viewer.canEditData) {
    // guardHrefOrRedirect は内部で redirect() を呼べるので
    // 明示的に使うなら:
    return redirect("/");
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
                <BreadcrumbLink href="/masters">マスタ管理</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/masters/roles">
                  ロール管理
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>ロール新規登録</BreadcrumbPage>
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
