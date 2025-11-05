// src/components/sidebar/app-sidebar.tsx
"use client";

import { useMemo } from "react";

import { ModeToggle } from "@/components/sidebar/mode-toggle";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { NavTeam } from "@/components/sidebar/nav-team";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { mockTeam } from "@/lib/sidebar/mock-team";
import { toMenuTree } from "@/lib/sidebar/menu.transform"; // 変換レイヤ

// ← ★ 追加：RBAC フィルタ
import { filterMenuRecordsByPriority } from "@/lib/sidebar/menu.rbac";
// ← ★ 追加：AuthContext から優先度を取得
import { useAuth } from "@/lib/auth/context";
import type { MenuRecord } from "@/lib/sidebar/menu.schema";

type Props = React.ComponentProps<typeof Sidebar> & {
  /** RSC（layout）から渡される部署別メニュー */
  records: MenuRecord[];
};

export function AppSidebar({ records, ...props }: Props) {
  const { user } = useAuth(); // user?.rolePriority を使う
  // 依存に使う“安定したプリミティブ”へ切り出し
  const rolePriority = user?.rolePriority ?? 0;

  const tree = useMemo(() => {
    const filtered = filterMenuRecordsByPriority(
      records.filter((r) => !r.hidden), // ← ここで非表示を除外
      rolePriority,
    );
    return toMenuTree(filtered);
  }, [rolePriority, records]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavTeam team={mockTeam} />
      </SidebarHeader>

      <SidebarContent>
        {/* priorityを利用したメニュー表示 */}
        <nav aria-label="メインメニュー">
          <NavMain items={tree} />
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <ModeToggle className="ml-auto" />
        {/* Contextを利用したユーザ情報表示 */}
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
