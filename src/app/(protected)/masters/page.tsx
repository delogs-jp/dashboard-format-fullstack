/* ============================================
 * src/app/(protected)/masters/page.tsx
 * マスタ管理一覧（カード型で各マスターの入口を並べる）
 * ============================================ */
import type { Metadata } from "next";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // あれば（なければ className を直書きでもOK）
import { ShieldCheck, Database, Tags, FolderCog } from "lucide-react";
// ★ 追加：SSRガード
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";

export const metadata: Metadata = {
  title: "マスタ管理",
  description: "各種マスターテーブルの編集入口ページ",
};

type MasterCard = {
  id: string;
  title: string;
  description: string;
  href?: string; // 遷移先がある場合のみ
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ready: boolean; // 実装済みかどうか
  badge?: string; // 任意のバッジ（例: New / Beta）
};

const MASTER_CARDS: MasterCard[] = [
  {
    id: "roles",
    title: "ロール管理",
    description:
      "権限ロールの新規登録／一覧／編集・削除（UIのみ・バリデーション対応）。",
    href: "/masters/roles",
    icon: ShieldCheck,
    ready: true,
    badge: "READY",
  },
  {
    id: "categories",
    title: "メニュー管理",
    description:
      "管理画面のサイドバーに表示するメニューを管理します。表示順や権限設定など。",
    href: "/masters/menus",
    icon: Tags,
    ready: true,
    badge: "READY",
  },
  // 以下は将来追加していくイメージ（手動で配列に追加）
  {
    id: "datasets",
    title: "データセット管理",
    description: "データの種別やラベル・単位などを管理します（Coming soon）。",
    icon: Database,
    ready: false,
  },
  {
    id: "projects",
    title: "プロジェクトマスタ",
    description: "プロジェクト基本情報の定義（Coming soon）。",
    icon: FolderCog,
    ready: false,
  },
];

export default async function Page() {
  // ★ ここで表示可否を判定（未ログイン/権限不足/未定義は内部でredirect）
  await guardHrefOrRedirect("/masters", "/");
  return (
    <>
      {/* ヘッダ（既存ページと同じ構成） */}
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
                <BreadcrumbPage>一覧</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* 本文 */}
      <div className="container p-4 pt-0">
        <div className="mb-3">
          <p className="text-muted-foreground text-sm">
            管理対象のマスターテーブルを選択してください。カードは実装に合わせて手動で追加します。
          </p>
        </div>

        {/* カードグリッド */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {MASTER_CARDS.map((card) => {
            const Icon = card.icon;
            const disabled = !card.ready || !card.href;

            return (
              <Card
                key={card.id}
                className={cn("w-full", !card.ready && "opacity-80")}
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5" aria-hidden />
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    {card.badge && (
                      <Badge variant="secondary" className="ml-1">
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {card.description}
                  </p>
                </CardContent>

                <CardFooter className="flex justify-end">
                  {card.href ? (
                    <Button
                      asChild
                      variant={disabled ? "outline" : "default"}
                      disabled={disabled}
                      className="cursor-pointer"
                      data-testid={`open-${card.id}`}
                    >
                      <Link href={card.href}>開く</Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled
                      className="cursor-not-allowed"
                    >
                      準備中
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
