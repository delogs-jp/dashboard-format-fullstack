// src/app/(protected)/changelog/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  History,
} from "lucide-react";

// ★ 追加：SSRガード
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";

export const metadata: Metadata = {
  title: "更新履歴",
  description: "DB連携版デモの更新履歴",
};

type Change = {
  date: `${number}-${number}-${number}`; // 例: "2025-09-02"
  version: `v${number}.${number}.${number}`; // 例: "v0.1.0"
  items: readonly string[];
};

const changes: ReadonlyArray<Change> = [
  {
    date: "2025-11-05",
    version: "v0.1.0",
    // ★ 内側の items は as const で読み取り専用化（任意）
    items: [
      "DB連携版 初期公開（ログイン、レイアウト、ユーザー管理、プロフィール、ロール、メニュー、404/忘れた導線）",
    ] as const,
  },
];

export default async function Page() {
  // ★ ここで表示可否を判定（未ログイン/権限不足/未定義は内部でredirect）
  await guardHrefOrRedirect("/changelog", "/");

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
              <BreadcrumbItem>
                <BreadcrumbPage>更新履歴</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="container flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">更新履歴</h1>
        </div>
        <p className="text-muted-foreground">
          リリースノート形式で変更点をまとめています。DB連携版は別途アナウンス予定です。
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5" />
              Changelog
            </CardTitle>
            <CardDescription>最新順で表示します。</CardDescription>
          </CardHeader>
          <CardContent>
            {changes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                まだ更新履歴はありません。
              </p>
            ) : (
              <ol className="relative ml-3 space-y-6 border-l pt-1 pl-6">
                {changes.map((c) => (
                  <li key={c.version} className="group">
                    <span className="bg-primary text-primary-foreground ring-background absolute top-[6px] -left-[9px] inline-flex items-center justify-center rounded-full ring-2">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    </span>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-xs">
                        {c.version}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <CalendarDays className="size-4" />
                        <time dateTime={c.date}>{c.date}</time>
                      </span>
                    </div>
                    <ul className="list-inside list-disc space-y-1">
                      {c.items.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>公開リポジトリ</CardTitle>
            <CardDescription>
              差分の詳細はコミット履歴をご参照ください。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button asChild aria-label="GitHubリポジトリを新しいタブで開く">
              <Link
                href="https://github.com/delogs-jp/dashboard-format-fullstack"
                target="_blank"
                rel="noreferrer"
              >
                delogs-jp/dashboard-format-fullstack
                <ExternalLink className="ml-2 size-4 opacity-80" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
