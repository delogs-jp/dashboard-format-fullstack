// src/app/(protected)/users/email-change-requests/page.tsx
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
import type { EmailChangeRow } from "./data-table"; // 後述の型に合わせる

import DataTable from "./data-table";
import { columns } from "./columns";
import { STATUS_LABEL, type ReqStatus } from "./status-multi-select";

export const metadata: Metadata = {
  title: "メールアドレス変更申請 | 管理画面レイアウト【DELOGs】",
  description: "本人確認済み(VERIFIED)のメール変更申請を承認/却下します。",
};

export default async function Page() {
  // ← 返り値（viewer）を受ける
  const viewer = await guardHrefOrRedirect("/users/email-change-requests", "/");
  // 1) 自分の部署特定
  const me = await prisma.user.findUnique({
    where: {
      id: /* guard 内の viewer.userId を使う */ (
        await guardHrefOrRedirect("/users/email-change-requests", "/")
      ).userId,
    },
    select: { departmentId: true },
  });
  if (!me) return null;

  // 2) 申請データ取得（部署内・未削除ユーザに紐づく申請）
  const raw = await prisma.emailChangeRequest.findMany({
    where: { departmentId: me.departmentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true, // = requestedAt 相当
      processedAt: true,
      processedBy: true,
      status: true,
      oldEmailPuny: true,
      newEmailPuny: true,
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

  // 3) 実効ロールを付与
  const rows: EmailChangeRow[] = await Promise.all(
    raw.map(async (r) => {
      const eff = r.user.departmentRoleId
        ? await getEffectiveRole({
            departmentId: me.departmentId,
            departmentRoleId: r.user.departmentRoleId,
          })
        : r.user.roleId
          ? await getEffectiveRole({
              departmentId: me.departmentId,
              roleId: r.user.roleId,
            })
          : null;

      return {
        id: r.id,
        requestedAt: r.createdAt,
        processedAt: r.processedAt ?? null,
        processedBy: r.processedBy ?? null,
        accountId: r.user.displayId, // 表示IDを「アカウントID」列に流用 or 別途取得
        userName: r.user.name,
        oldEmail: punycode.toUnicode(r.oldEmailPuny),
        newEmail: punycode.toUnicode(r.newEmailPuny),
        status: r.status,
        roleCode: eff?.code ?? "",
        roleName: eff?.name ?? "(不明)",
        roleBadgeColor: eff?.badgeColor ?? null,
      };
    }),
  );

  // 4) ロール選択肢（登場ロールのみ）
  const roleOptions = Array.from(
    new Map(
      rows.map((r) => [r.roleCode, { value: r.roleCode, label: r.roleName }]),
    ).values(),
  );

  // 5) 状態選択肢（登場状態のみ）
  const statusOptions = Array.from(new Set(rows.map((r) => r.status))).map(
    (s) => ({ value: s as ReqStatus, label: STATUS_LABEL[s as ReqStatus] }),
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
                <BreadcrumbPage>メールアドレス変更申請</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="container p-4 pt-0">
        {/* canDownloadData を渡す */}
        <DataTable
          columns={columns}
          roleOptions={roleOptions}
          statusOptions={statusOptions}
          data={rows}
          canDownloadData={viewer.canDownloadData}
        />
      </div>
    </>
  );
}
