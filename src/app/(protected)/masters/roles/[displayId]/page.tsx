// src/app/(protected)/masters/roles/[displayId]/page.tsx

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

import { prisma } from "@/lib/database";
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";
import Client from "./client";

import type { DepartmentRoleUpdateValues } from "@/lib/department-roles/schema";

export const metadata: Metadata = {
  title: "ロール編集",
  description: "部署ローカル（custom）／ベースロール上書き（override）の編集",
};

export default async function Page({
  params,
}: {
  params: Promise<{ displayId: string }>;
}) {
  const { displayId } = await params;

  // SSR ガード（userId を取得）
  const viewer = await guardHrefOrRedirect(`/masters/roles/${displayId}`, "/");

  // 部署ID
  const me = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { departmentId: true },
  });
  if (!me?.departmentId) notFound();

  let initialValues: DepartmentRoleUpdateValues | null = null;

  if (displayId.startsWith("DR")) {
    // DR を直接取得（custom / override どちらでも）
    const dr = await prisma.departmentRole.findUnique({
      where: { displayId },
      select: {
        displayId: true,
        departmentId: true,
        roleId: true,
        // custom
        code: true,
        name: true,
        priority: true,
        badgeColor: true,
        canDownloadData: true,
        canEditData: true,
        isEnabled: true,
        remarks: true,
        // override
        nameOverride: true,
        badgeColorOverride: true,
        role: { select: { displayId: true, name: true, badgeColor: true } },
      },
    });
    if (!dr || dr.departmentId !== me.departmentId) notFound();

    if (dr.roleId) {
      // override（既存）。UI には「実効値」を初期表示させる
      const effName = dr.nameOverride ?? dr.role?.name ?? "";
      const effColor =
        dr.badgeColorOverride ?? dr.role?.badgeColor ?? "#000000";

      initialValues = {
        kind: "override",
        displayId: dr.displayId,
        roleDisplayId: dr.role?.displayId, // 既存でも保持しておくと便利
        isEnabled: dr.isEnabled,
        nameOverride: effName, // ← 実効値をそのまま初期表示
        badgeColorOverride: effColor, // ← 実効値をそのまま初期表示
      };
    } else {
      // custom
      initialValues = {
        kind: "custom",
        displayId: dr.displayId,
        code: dr.code ?? "",
        name: dr.name ?? "",
        priority: dr.priority ?? 0,
        badgeColor: dr.badgeColor ?? "#000000",
        isEnabled: dr.isEnabled,
        canDownloadData: dr.canDownloadData ?? false,
        canEditData: dr.canEditData ?? false,
        remarks: dr.remarks ?? undefined,
      };
    }
  } else if (displayId.startsWith("RL")) {
    // Role から編集（override 初回 or 既存）
    const role = await prisma.role.findUnique({
      where: { displayId },
      select: {
        displayId: true,
        name: true,
        badgeColor: true,
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
    if (!role) notFound();

    const ov = role.departmentRoles[0];
    if (ov) {
      // 既存 override：実効値で初期表示（override 優先、なければ Role）
      const effName = ov.nameOverride ?? role.name;
      const effColor = ov.badgeColorOverride ?? role.badgeColor ?? "#000000";

      initialValues = {
        kind: "override",
        displayId: ov.displayId,
        roleDisplayId: role.displayId,
        isEnabled: ov.isEnabled,
        nameOverride: effName,
        badgeColorOverride: effColor,
      };
    } else {
      // 初回 override：Role 値をそのまま初期値に入れて表示
      initialValues = {
        kind: "override",
        roleDisplayId: role.displayId,
        isEnabled: true,
        nameOverride: role.name, // ← そのまま表示
        badgeColorOverride: role.badgeColor ?? "#000000", // ← そのまま表示
      };
    }
  } else {
    notFound();
  }

  if (!initialValues) notFound();

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
                <BreadcrumbPage>ロール編集（{displayId}）</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="max-w-xl p-4 pt-0">
        <Client
          initialValues={initialValues}
          canEditData={viewer.canEditData}
        />
      </div>
    </>
  );
}
