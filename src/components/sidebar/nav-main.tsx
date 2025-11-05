/* 修正版 “全量”：src/components/sidebar/nav-main.tsx */
"use client";

import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { NavLink } from "@/components/sidebar/nav-link";
import { useActive } from "@/lib/sidebar/use-active";
import type { MenuTree, MenuNode } from "@/lib/sidebar/menu.schema";

type Props = { items: MenuTree };

export function NavMain({ items }: Props) {
  const { isActive, isAncestor, ariaCurrentFor, openByDefault } =
    useActive(items);
  const { state, isMobile, setOpen } = useSidebar();

  // サイドバーが“collapsed（アイコンのみ）”のときは、親クリックでまずサイドバーを展開
  const handleTopParentClick = (e: React.MouseEvent) => {
    if (state === "collapsed" && !isMobile) {
      setOpen(true);
      e.preventDefault();
    }
  };

  // ─────────────────────────────────────────────
  // レベル0（トップ階層）を描画
  // ─────────────────────────────────────────────
  return (
    <SidebarGroup>
      <SidebarGroupLabel>メニュー</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((node) => (
          <TopNode
            key={node.id}
            node={node}
            isActive={isActive}
            isAncestor={isAncestor}
            ariaCurrentFor={ariaCurrentFor}
            openByDefault={openByDefault}
            onTopParentClick={handleTopParentClick}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/* ========== トップ階層用：親は SidebarMenuItem、子は SidebarMenuSub で受ける ========== */
function TopNode({
  node,
  isActive,
  isAncestor,
  ariaCurrentFor,
  openByDefault,
  onTopParentClick,
}: {
  node: MenuNode;
  isActive: (id: string) => boolean;
  isAncestor: (id: string) => boolean;
  ariaCurrentFor: (id: string) => "page" | undefined;
  openByDefault: (id: string) => boolean;
  onTopParentClick: (e: React.MouseEvent) => void;
}) {
  const hasChildren = !!node.children?.length;

  // 子なし（トップの葉） → そのままリンク
  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip={node.title}
          className="data-[active=true]:bg-muted data-[active=true]:font-semibold"
        >
          <NavLink
            //href={node.href}
            href={node.href ?? "#"}
            active={isActive(node.id)}
            ariaCurrent={ariaCurrentFor(node.id)}
          >
            {node.icon && <node.icon className="size-4" />}
            <span>{node.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // 子あり（トップの親） → Collapsible。親は“開閉のみ”
  return (
    <Collapsible
      asChild
      defaultOpen={openByDefault(node.id)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={node.title}
            onClick={onTopParentClick}
            data-active={
              isActive(node.id) || isAncestor(node.id) ? "true" : undefined
            }
            className="data-[active=true]:bg-muted data-[active=true]:font-semibold"
          >
            {node.icon && <node.icon className="size-4" />}
            <span>{node.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="mr-0">
            {node.children?.map((child) => (
              <SubNode
                key={child.id}
                node={child}
                isActive={isActive}
                isAncestor={isAncestor}
                ariaCurrentFor={ariaCurrentFor}
                openByDefault={openByDefault}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/* ========== サブ階層用：子を持つなら“さらに”Collapsible、持たなければリンク ========== */
function SubNode({
  node,
  isActive,
  ariaCurrentFor,
  openByDefault,
}: {
  node: MenuNode;
  isActive: (id: string) => boolean;
  isAncestor: (id: string) => boolean;
  ariaCurrentFor: (id: string) => "page" | undefined;
  openByDefault: (id: string) => boolean;
}) {
  const hasChildren = !!node.children?.length;

  // 子なし（葉） → リンク
  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          className="data-[active=true]:bg-muted data-[active=true]:font-semibold"
        >
          <NavLink
            //href={node.href}
            href={node.href ?? "#"}
            active={isActive(node.id)}
            ariaCurrent={ariaCurrentFor(node.id)}
          >
            <span>{node.title}</span>
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  // 子あり（サブ階層の親） → サブ内 Collapsible。親は開閉のみ（リンクにしない）
  return (
    <SidebarMenuSubItem>
      <Collapsible defaultOpen={openByDefault(node.id)}>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton
            asChild
            className="data-[active=true]:bg-muted data-[active=true]:font-semibold"
          >
            {/* ← 最終的なトリガー要素は <button> */}
            <button
              type="button"
              data-active={openByDefault(node.id) ? "true" : undefined}
              className="group flex w-full items-center justify-between"
            >
              <span>{node.title}</span>
              {/* ← トリガーの aria-expanded を見て回転 */}
              <ChevronRight className="ml-1 size-4 transition-transform duration-200 group-aria-[expanded=true]:rotate-90" />
            </button>
          </SidebarMenuSubButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 ml-2">
            {node.children?.map((gchild) => (
              <SidebarMenuSubItem key={gchild.id}>
                <SidebarMenuSubButton
                  asChild
                  className="data-[active=true]:bg-muted data-[active=true]:font-semibold"
                >
                  <NavLink
                    //href={gchild.href}
                    href={gchild.href ?? "#"}
                    active={isActive(gchild.id)}
                    ariaCurrent={ariaCurrentFor(gchild.id)}
                  >
                    <span>{gchild.title}</span>
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}
