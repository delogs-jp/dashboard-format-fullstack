// src/components/sidebar/nav-user.tsx
"use client";
import { useTransition } from "react"; // ★ 追加
import { logoutAction } from "@/app/_actions/auth/logout"; // ★ 追加
import Link from "next/link";
import {
  Bell,
  ChevronsUpDown,
  KeyRound,
  LogOut,
  User as UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from "@/lib/auth/context";

export function NavUser() {
  const { isMobile } = useSidebar();
  const [pending, startTransition] = useTransition(); // ★ 追加

  const { user } = useAuth();

  const name = user?.name ?? "ゲスト";
  const email = user?.email ?? "";
  const avatarUrl = user?.avatarUrl ?? "/user-avatar.png"; // 後続章で保護配信URLへ置換
  const initial = name.slice(0, 1);

  const handleLogout = () => {
    if (pending) return; // ★ 二重実行防止
    startTransition(async () => {
      await logoutAction(); // サーバ側で Cookie 削除 + Session 失効 + redirect("/login")
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label="ユーザーメニューを開く"
              disabled={!user} // 未ログイン時は操作不可
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {/* 画像は next/image でもOKだが AvatarImage で十分 */}
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="rounded-lg">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {email && (
                    <span className="text-muted-foreground truncate text-xs">
                      {email}
                    </span>
                  )}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* ヘッダー（ユーザー情報の再掲） */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={name} />
                  <AvatarFallback className="rounded-lg">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  {email && (
                    <span className="text-muted-foreground truncate text-xs">
                      {email}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                {/* 変更: /profile に差し替え */}
                <Link href="/profile" className="flex items-center gap-2">
                  <UserIcon className="size-4" />
                  ユーザー情報確認
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                {/* 変更: /profile/password に差し替え */}
                <Link
                  href="/profile/password"
                  className="flex items-center gap-2"
                >
                  <KeyRound className="size-4" />
                  パスワード変更
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                {/* TODO: /notifications に差し替え */}
                <Link href="#" className="flex items-center gap-2">
                  <Bell className="size-4" />
                  通知
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* ★ ここを Link ではなく onClick で Action 直結 */}
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={pending}
              className="text-destructive flex cursor-pointer items-center gap-2"
              aria-disabled={pending}
            >
              <LogOut className="size-4" />
              {pending ? "ログアウト中..." : "ログアウト"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
