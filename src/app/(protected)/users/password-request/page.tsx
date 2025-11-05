// src/app/(protected)/users/password-request/page.tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/database";
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
import * as punycode from "punycode/";
import { getEffectiveRole } from "@/lib/auth/effective-role";

import DataTable from "./data-table";
import { columns, type PasswordRequestRow } from "./columns";
import { type PwReqStatus } from "./status-multi-select";

export const metadata: Metadata = {
  title: "パスワード再発行依頼 | 管理画面レイアウト【DELOGs】",
  description:
    "Data table（shadcn/ui + @tanstack/react-table）でパスワード再発行依頼を一覧表示",
};

export default async function Page() {
  // 1) ページ閲覧ガード
  const viewer = await guardHrefOrRedirect("/users/password-request", "/");

  // 2) 自分の部署
  const me = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { departmentId: true },
  });
  if (!me) return null;

  // 3) 部署内の再発行依頼を取得（必要列のみ）
  const raw = await prisma.passwordRequest.findMany({
    where: { departmentId: me.departmentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true, // 依頼日時
      processedAt: true,
      processedBy: true,
      note: true,
      status: true,
      emailPuny: true,
      user: {
        select: {
          displayId: true,
          name: true,
          roleId: true,
          departmentRoleId: true,
        },
      },
    },
  });

  // 4) 実効ロールへ正規化 & 表示用に整形
  const rows: PasswordRequestRow[] = await Promise.all(
    raw.map(async (r) => {
      const eff = r.user
        ? r.user.departmentRoleId
          ? await getEffectiveRole({
              departmentId: me.departmentId,
              departmentRoleId: r.user.departmentRoleId,
            })
          : r.user.roleId
            ? await getEffectiveRole({
                departmentId: me.departmentId,
                roleId: r.user.roleId,
              })
            : null
        : null;

      return {
        id: r.id,
        requestedAt: r.createdAt,
        processedAt: r.processedAt ?? null,
        processedBy: r.processedBy ?? null,
        userId: r.user?.displayId ?? "-",
        userName: r.user?.name ?? "-",
        email: punycode.toUnicode(r.emailPuny),
        status: r.status as PwReqStatus,
        roleCode: eff?.code ?? "",
        roleName: eff?.name ?? "(不明)",
        roleBadgeColor: eff?.badgeColor ?? null,
        note: r.note ?? "",
      };
    }),
  );

  // 5) フィルタ選択肢（一覧に登場するものだけ）
  const roleOptions = Array.from(
    new Map(
      rows
        .filter((r) => r.roleCode) // 空コードは除外
        .map((r) => [r.roleCode, { value: r.roleCode, label: r.roleName }]),
    ).values(),
  );

  /*
  const statusOptions = Array.from(new Set(rows.map((r) => r.status))).map(
    (s) => ({
      value: s as PwReqStatus,
      label: PW_STATUS_LABEL[s as PwReqStatus],
    }),
  );
*/
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
                <BreadcrumbPage>パスワード再発行依頼</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="container p-4 pt-0">
        <DataTable
          columns={columns}
          data={rows}
          roleOptions={roleOptions}
          //statusOptions={statusOptions}
          canDownloadData={viewer.canDownloadData}
        />
      </div>
    </>
  );
}
