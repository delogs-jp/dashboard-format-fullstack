// src/app/(protected)/masters/menus/page.tsx
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
import { fetchMenusForList } from "@/lib/sidebar/menu.fetch";
import type { MenuRecord } from "@/lib/sidebar/menu.schema";
import DataTable from "./data-table";
import { columns } from "./columns";

export const metadata: Metadata = {
  title: "メニュー一覧",
  description: "部署ごとのメニュー可視・順序の上書き（DB連携）。",
};

export default async function Page() {
  const viewer = await guardHrefOrRedirect("/masters/menus", "/");

  // 自分の部署だけ取得
  const me = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { departmentId: true },
  });
  if (!me?.departmentId) return null;

  // 部署の「合成済み」メニュー（hidden=含む・isActive=上書き反映）
  const menus = await fetchMenusForList(me.departmentId);

  // ツリー順（階層順）に初期整列
  const hier = orderHierarchically(menus);

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
                <BreadcrumbPage>メニュー一覧</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="w-full max-w-[1729px] p-4 pt-0">
        <DataTable
          columns={columns}
          data={hier}
          canDownloadData={viewer.canDownloadData}
          canEditData={viewer.canEditData}
        />
      </div>
    </>
  );
}

/** 親→子→孫の順で並べ直し（表示は常に階層順） */
function orderHierarchically(list: MenuRecord[]): MenuRecord[] {
  const byParent = new Map<string | null, MenuRecord[]>();
  for (const r of list) {
    const key = r.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(r);
    byParent.set(key, arr);
  }
  for (const [, arr] of byParent) arr.sort((a, b) => a.order - b.order);

  const out: MenuRecord[] = [];
  const walk = (parentId: string | null) => {
    const children = byParent.get(parentId) ?? [];
    for (const c of children) {
      out.push(c);
      walk(c.displayId);
    }
  };
  walk(null);
  return out;
}
