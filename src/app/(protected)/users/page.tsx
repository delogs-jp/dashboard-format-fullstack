// src/app/(protected)/users/page.tsx
import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";
import { prisma } from "@/lib/database";
import * as punycode from "punycode/";
import { getEffectiveRole } from "@/lib/auth/effective-role"; // ★ 追加
import DataTable from "./data-table";
import { columns, type UserRow } from "./columns";

export const metadata: Metadata = {
  title: "ユーザ一覧",
  description:
    "Data table（shadcn/ui + @tanstack/react-table）でユーザ一覧を表示",
};

export default async function Page() {
  // 1) ページ閲覧ガード（未ログイン/権限不足なら内部でredirect）
  const viewer = await guardHrefOrRedirect("/users", "/");

  // 2) 自分の departmentId を userId から解決（スナップショット非保持方針）
  const me = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { departmentId: true },
  });
  if (!me) return null; // 想定外

  // 3) 部署内・未削除ユーザの取得（必要列のみ）
  const usersRaw = await prisma.user.findMany({
    where: { departmentId: me.departmentId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      displayId: true,
      name: true,
      email: true,
      isActive: true,
      phone: true,
      remarks: true,
      createdAt: true,
      updatedAt: true,
      roleId: true,
      departmentRoleId: true,
    },
  });

  // ★ 実効ロールへ正規化
  const users: UserRow[] = await Promise.all(
    usersRaw.map(async (u) => {
      // ★ ユニオンが確定するように分岐して渡す
      const eff = u.departmentRoleId
        ? await getEffectiveRole({
            departmentId: me.departmentId,
            departmentRoleId: u.departmentRoleId,
          })
        : u.roleId
          ? await getEffectiveRole({
              departmentId: me.departmentId,
              roleId: u.roleId,
            })
          : null; // 両方 null は想定外だが安全側で null

      return {
        displayId: u.displayId,
        name: u.name,
        email: punycode.toUnicode(u.email),
        roleCode: eff?.code ?? "",
        roleName: eff?.name ?? "(不明)",
        roleBadgeColor: eff?.badgeColor ?? null,
        isActive: u.isActive,
        phone: u.phone,
        remarks: u.remarks,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    }),
  );

  // 5) フィルタ用ロール選択肢（一覧に登場するロールだけ）
  const roleOptions = Array.from(
    new Map(
      users.map((u) => [u.roleCode, { value: u.roleCode, label: u.roleName }]),
    ).values(),
  );

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
                <BreadcrumbPage>ユーザ一覧</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="w-full max-w-[1729px] p-4 pt-0">
        <DataTable
          columns={columns}
          data={users}
          roleOptions={roleOptions}
          canDownloadData={viewer.canDownloadData}
          canEditData={viewer.canEditData}
        />
      </div>
    </>
  );
}
