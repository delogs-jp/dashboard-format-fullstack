// src/app/(protected)/dashboard/page.tsx
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  CheckCircle2,
  ExternalLink,
  Mail,
  ShieldCheck,
  StickyNote,
} from "lucide-react";

// ★ 追加：SSRガード
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";

export const metadata: Metadata = {
  title: "ダッシュボード",
  description:
    "shadcn/uiを使用した管理画面レイアウトの概要をまとめています。制作過程のわかる記事やGithubへのリンクを記載しています。",
};

export default async function Page() {
  // ★ ここで表示可否を判定（未ログイン/権限不足/未定義は内部でredirect）
  await guardHrefOrRedirect("/dashboard", "/");

  const articles = [
    {
      title:
        "[管理画面フォーマット開発編 #1] Prisma × PostgreSQLで進めるDB設計",
      href: "https://delogs.jp/next-js/backend/format-prisma-db-design",
    },
    {
      title:
        "[管理画面フォーマット開発編 #2] JWT +Cookie＋middlewareで実装するログイン機能",
      href: "https://delogs.jp/next-js/backend/format-login",
    },
    {
      title:
        "[管理画面フォーマット開発編 #3] AuthProviderでログイン済みユーザー情報を全体共有",
      href: "https://delogs.jp/next-js/backend/format-auth-provider",
    },
    {
      title:
        "[管理画面フォーマット開発編 #4] Server Actionで実装するアバター画像のアップロードと表示",
      href: "https://delogs.jp/next-js/backend/format-avatar-upload",
    },
    {
      title: "[管理画面フォーマット開発編 #5] ユーザプロフィール更新",
      href: "https://delogs.jp/next-js/backend/format-profile",
    },
    {
      title:
        "[管理画面フォーマット開発編 #6] RBAC調整 ─ ページ単位のアクセス制御を実装する",
      href: "https://delogs.jp/next-js/backend/format-rbac-guard",
    },
    {
      title: "[管理画面フォーマット開発編 #7] ユーザ管理UIをDB連携する",
      href: "https://delogs.jp/next-js/backend/format-users",
    },
    {
      title:
        "[管理画面フォーマット開発編 #8 前編] 部署別ロール ─ DepartmentRoleテーブル導入とDB設計",
      href: "https://delogs.jp/next-js/backend/format-department-role-db",
    },
    {
      title:
        "[管理画面フォーマット開発編 #8 後編] 部署別ロール ─ 管理UIとServer Action実装",
      href: "https://delogs.jp/next-js/backend/format-department-role-ui",
    },
    {
      title:
        "[管理画面フォーマット開発編 #9 前編] 部署別ロール対応 ─ ユーザ管理の改修",
      href: "https://delogs.jp/next-js/backend/format-department-role-users",
    },
    {
      title:
        "[管理画面フォーマット開発編 #9 後編] 部署別ロール対応 ─ プロフィール管理の改修",
      href: "https://delogs.jp/next-js/backend/format-department-role-profile",
    },
    {
      title: "[管理画面フォーマット開発編 #10] メニュー管理UIをDB連携する",
      href: "https://delogs.jp/next-js/backend/format-department-menu",
    },
    {
      title:
        "[管理画面フォーマット開発編 #11] パスワード再発行依頼とメールテンプレート統合",
      href: "https://delogs.jp/next-js/backend/format-password-request",
    },
  ];

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
                <BreadcrumbPage>概要</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* ==== ページ内容 ==== */}
      <div className="container flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* ヘッダー */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              管理画面フォーマット（DB連携版）のデモページ
            </h1>
            <Badge variant="secondary" className="rounded-full">
              Demo
            </Badge>
          </div>
          <p className="text-muted-foreground">
            このデモはUIのみ版を改良してDB連携したものです。
          </p>
        </div>

        {/* 注意/概要 */}
        <Alert className="border-amber-200 bg-amber-50/70 dark:border-amber-800/50 dark:bg-amber-900/20">
          <ShieldCheck className="size-5" />
          <AlertTitle>構成について</AlertTitle>
          <AlertDescription>
            入力フォームは
            <span className="font-medium">Zod + React Hook Form</span>
            によるバリデーションを行い、サーバアクションでDBへの登録・更新・削除を行います。
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* 左：記事の総括（タイムライン風） */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-5" />
                制作過程（記事まとめ）
              </CardTitle>
              <CardDescription>
                各ステップの詳細は以下の記事をご参照ください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative ml-3 space-y-6 border-l pl-6">
                {articles.map((a) => (
                  <li key={a.href} className="group">
                    <span className="bg-primary text-primary-foreground ring-background absolute -left-[9px] mt-1.5 inline-flex items-center justify-center rounded-full ring-2">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    </span>
                    <Link
                      href={a.href}
                      target="_blank"
                      rel="noreferrer"
                      prefetch={false}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {a.title}
                      <ExternalLink className="ml-1 inline size-3 align-text-top opacity-70" />
                    </Link>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* 右：クイックリンク */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  公開リポジトリ
                </CardTitle>
                <CardDescription>
                  ソースコードはGitHubで公開しています。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ご意見・ご感想
                </CardTitle>
                <CardDescription>
                  お問い合わせ または X（旧Twitter）からどうぞ。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <Button
                  asChild
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <Link
                    href="https://delogs.jp/contact"
                    target="_blank"
                    prefetch={false}
                    rel="noreferrer"
                  >
                    <Mail className="mr-2 size-4" />
                    お問い合わせページへ
                    <ExternalLink className="ml-2 size-4 opacity-80" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link
                    href="https://x.com/DELOGs2506"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @DELOGs2506 へ
                    <ExternalLink className="ml-2 size-4 opacity-80" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
