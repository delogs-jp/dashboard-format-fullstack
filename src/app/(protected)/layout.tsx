// src/app/(protected)/layout.tsx
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AuthProviderServer } from "@/lib/auth/provider-server";

import { lookupSessionFromCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/database";
import { fetchMenusForDepartment } from "@/lib/sidebar/menu.fetch";
import type { MenuRecord } from "@/lib/sidebar/menu.schema";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {/* サーバ側で部署ID→メニュー取得（未ログイン時は空配列） */}
      <SidebarWithMenus>{children}</SidebarWithMenus>{" "}
    </SidebarProvider>
  );
}

// RSC 内でメニューを取得して AppSidebar に渡すラッパ
async function SidebarWithMenus({ children }: { children: React.ReactNode }) {
  let records: MenuRecord[] = [];
  const session = await lookupSessionFromCookie();

  if (session.ok) {
    // 部署IDだけ最小限に取得
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { departmentId: true },
    });
    if (user?.departmentId) {
      records = await fetchMenusForDepartment(user.departmentId);
    }
  }

  return (
    <AuthProviderServer>
      <AppSidebar records={records} />
      <SidebarInset className="min-w-0">
        {/* サイドバー/ヘッダ/パンくずは“各 page.tsx”で自由に */}
        {children}
        <Toaster richColors closeButton />
      </SidebarInset>
    </AuthProviderServer>
  );
}
