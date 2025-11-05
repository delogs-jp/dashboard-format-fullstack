// src/app/(protected)/masters/roles/page.tsx
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
import DataTable from "./data-table";
import { columns, type DepartmentRoleRow } from "./columns";

export const metadata: Metadata = {
  title: "ロール一覧",
  description:
    "部署視点でのロール一覧（Role + DepartmentRole）を混在表示。検索/フィルタ/CSV対応",
};

export default async function Page() {
  // 1) SSRガード（viewer には userId / 権限が入る）
  const viewer = await guardHrefOrRedirect("/masters/roles", "/");

  // 2) 自部署ID
  const me = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { departmentId: true },
  });
  if (!me?.departmentId) return null;

  // 3) ベースRole（当該部署の override を1件だけ同時取得）
  const base = await prisma.role.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" },
    select: {
      displayId: true,
      code: true,
      name: true,
      badgeColor: true,
      priority: true,
      canEditData: true,
      canDownloadData: true,
      createdAt: true,
      updatedAt: true,
      departmentRoles: {
        where: { departmentId: me.departmentId, roleId: { not: null } },
        take: 1,
        select: {
          displayId: true,
          isEnabled: true,
          nameOverride: true,
          badgeColorOverride: true,
        },
      },
    },
  });

  // 4) 部署カスタム（roleId == null のみ）
  const customs = await prisma.departmentRole.findMany({
    where: { departmentId: me.departmentId, roleId: null },
    orderBy: { priority: "asc" },
    select: {
      displayId: true,
      code: true,
      name: true,
      badgeColor: true,
      priority: true,
      canEditData: true,
      canDownloadData: true,
      isEnabled: true,
      remarks: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 5) UI行へ整形（kind / 実効表示名・色を組み立て）
  const fromRole: DepartmentRoleRow[] = base.map((r) => {
    const ov = r.departmentRoles[0];
    return {
      displayId: r.displayId,
      code: r.code,
      kind: ov ? "override" : "role",
      nameEffective: ov?.nameOverride ?? r.name,
      badgeColorEffective: ov?.badgeColorOverride ?? r.badgeColor ?? null,
      priority: r.priority,
      canEditData: r.canEditData,
      canDownloadData: r.canDownloadData,
      isEnabledInDepartment: ov ? ov.isEnabled : true,
      remarks: null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });

  const fromCustom: DepartmentRoleRow[] = customs.map((dr) => ({
    displayId: dr.displayId,
    code: dr.code ?? "",
    kind: "custom",
    nameEffective: dr.name ?? "",
    badgeColorEffective: dr.badgeColor ?? null,
    priority: dr.priority ?? 0,
    canEditData: dr.canEditData ?? false,
    canDownloadData: dr.canDownloadData ?? false,
    isEnabledInDepartment: dr.isEnabled,
    remarks: dr.remarks ?? null,
    createdAt: dr.createdAt,
    updatedAt: dr.updatedAt,
  }));

  const rows: DepartmentRoleRow[] = [...fromRole, ...fromCustom];

  // 6) 種別フィルタ用の選択肢（固定3種）
  const kindOptions = [
    { value: "role", label: "ベース" },
    { value: "override", label: "上書き" },
    { value: "custom", label: "部署ローカル" },
  ] as const;

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
              <BreadcrumbItem>
                <BreadcrumbPage>ロール一覧</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="w-full max-w-[1729px] p-4 pt-0">
        <DataTable
          columns={columns}
          data={rows}
          kindOptions={
            kindOptions as unknown as { value: string; label: string }[]
          }
          canDownloadData={viewer.canDownloadData}
          canEditData={viewer.canEditData}
        />
      </div>
    </>
  );
}
