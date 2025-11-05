// src/app/(protected)/tutorial/page.tsx
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  BookOpen,
  Database, // Wrench -> Database
  ExternalLink,
  ListChecks,
  Network, // Info -> Network
  ShieldCheck, // Wrench -> ShieldCheck
} from "lucide-react";
// ★ SSRガード (変更なし)
import { guardHrefOrRedirect } from "@/lib/auth/guard.ssr";

// ★ メタデータ更新
export const metadata: Metadata = {
  title: "チュートリアル",
  description:
    "DB連携済みの法人向け管理画面デモです。Next.js (App Router), Prisma, PostgreSQL を使用した認証、RBAC、RLS（データ分離）の実装を確認できます。",
};

export default async function Page() {
  // ★ 権限チェック (変更なし)
  await guardHrefOrRedirect("/tutorial", "/");

  // ★ 機能リストをDB連携版に更新
  const features = [
    "JWT + Cookie認証（src/middleware.ts で保護）",
    "ログイン / ログアウト（Server Actions）",
    "部署別ロール（RBAC）による柔軟な権限設定",
    "Priority（優先度）に基づく動的メニュー制御",
    " `departmentId` によるマルチテナント・データ分離 (RLS)",
    "ユーザー管理 CRUD（Server Actions + Zod）",
    "ロール管理 CRUD（Server Actions + Zod）",
    "メニュー管理 CRUD（Server Actions + Zod）",
    "プロフィール編集・パスワード変更（Server Actions）",
    "Shadcn/uiベースの共通レイアウト + ダークモード",
    "データグリッド（ソート・フィルタリング・列表示切替）",
    "グローバルな404 Not Foundハンドリング",
  ];

  // ★ アーキテクチャのポイント (旧 mockFiles / exampleCode)
  const architecturePoints = [
    {
      icon: Database,
      title: "Prisma (PostgreSQL)",
      description:
        "すべてのデータは `prisma/schema.prisma` に基づきDBで管理されます。mockファイル（*.mock.ts）は使用していません。",
    },
    {
      icon: ShieldCheck,
      title: "部署別ロール (RBAC)",
      description:
        " `User` は `DepartmentRole`（部署別設定）に紐づきます。これにより、部署ごとに「カスタムロール」や「グローバルロールの上書き」が可能です。（`src/lib/auth/effective-role.ts` で実効権限を計算）",
    },
    {
      icon: Network,
      title: "データ分離 (RLS)",
      description:
        " `User` や `Contact` など、全モデルが `departmentId` に紐づくマルチテナント設計です。Server Actionsは実行ユーザーの `departmentId` を使い、他部署のデータへのアクセスをDBレベルで防ぎます。",
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
                <BreadcrumbPage>チュートリアル</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="container flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            チュートリアル
          </h1>
        </div>
        <p className="text-muted-foreground">
          {/* ★ 説明文を更新 */}
          このページでは、DB連携済みの法人向け管理画面デモの「主な機能」と「設計のポイント」をまとめます。
        </p>

        {/* できること */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-5" />
              {/* ★ タイトル更新 */}
              実装済みの主な機能
            </CardTitle>
            <CardDescription>
              {/* ★ 説明文を更新 */}
              Next.js 15 (App Router), Prisma, PostgreSQL
              で構築された全機能が動作します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ★ 機能リスト更新 */}
            <ul className="grid list-inside list-disc gap-2 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* ★ カスタマイズ方法 -> アーキテクチャのポイント に変更 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5" />
              アーキテクチャのポイント
            </CardTitle>
            <CardDescription>
              このデモは、 `schema.prisma`
              に定義された設計思想に基づいています。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <ShieldCheck className="size-5" />
              <AlertTitle>フォームとデータフロー</AlertTitle>
              <AlertDescription>
                {/* ★ 説明文を更新 */}
                本デモでは{" "}
                <span className="font-medium">Zod + React Hook Form</span>{" "}
                による入力検証後、
                <span className="font-medium">Server Actions</span>{" "}
                を介して安全にDBへデータが保存されます。
              </AlertDescription>
            </Alert>

            {/* ★ mockファイルの説明を削除し、アーキテクチャのポイントに変更 */}
            <div className="grid gap-6 lg:grid-cols-3">
              {architecturePoints.map((point) => (
                <Card key={point.title} className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <point.icon className="size-5" />
                      {point.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {point.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ★ mockコードの例をすべて削除 */}
          </CardContent>
        </Card>

        {/* リポジトリ */}
        <Card>
          <CardHeader>
            <CardTitle>公開リポジトリ</CardTitle>
            <CardDescription>
              {/* ★ 説明文を更新 */}
              ソースコードはGitHubで公開しています。（DB連携・フルスタック版）
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link
                // ★ リポジトリ名をDB連携版（想定）に変更
                href="https://github.com/delogs-jp/dashboard-format-fullstack"
                target="_blank"
                rel="noreferrer"
              >
                {/* ★ リポジトリ名を変更 */}
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
