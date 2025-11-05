// src/app/(protected)/users/[displayId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
// ★ 追加：初期値と候補の取得は Server Action 経由に統一
import { getUserForEditAction } from "@/app/_actions/users/get-user-for-edit";
import { getAssignableRolesAction } from "@/app/_actions/department-roles/get-assignable-roles";

export const metadata: Metadata = {
  title: "ユーザ編集",
  description: "共通フォーム（shadcn/ui + RHF + Zod）でユーザ情報を編集",
};

export default async function Page({
  params,
}: {
  params: Promise<{ displayId: string }>;
}) {
  const { displayId } = await params;

  await guardHrefOrRedirect(`/users/${displayId}`, "/");

  const resUser = await getUserForEditAction(displayId); // ← displayId を渡す
  if (!resUser.ok) {
    // 対象が部署外/削除済み/未存在 → 404
    notFound();
  }

  const resOpts = await getAssignableRolesAction(); // ADMIN 専用（2章の方針）
  if (!resOpts.ok) {
    // 候補を取れない = 表示すべきでない → 404 に寄せる or 403 を投げる
    notFound();
  }

  // 現割当が options に無い場合は補完（無効DRなど）
  const options = [...resOpts.options];
  const cur = resUser.data.currentAssignment;
  if (cur && !options.some((o) => o.value === cur.value)) {
    options.unshift({ ...cur, priority: -1 });
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
                <BreadcrumbPage>ユーザ情報編集（{displayId}）</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="max-w-xl p-4 pt-0">
        <Client initialValues={resUser.data} roleOptions={options} />
      </div>
    </>
  );
}
