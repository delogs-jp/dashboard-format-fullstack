# 管理画面フォーマット DB連携版 【DELOGs】

[![DELOGs 記事へ](https://img.shields.io/badge/DELOGs-記事はこちら-1e90ff?logo=githubpages)](https://delogs.jp/next-js/backend)

DELOGs で連載中の「法人向け管理画面フォーマット」のフルスタック・DB連携版のリポジトリです。

Next.js (App Router), Prisma, PostgreSQL を使用した、実践的な認証 (JWT)、RBAC (部署別ロール)、マルチテナント (RLS/ departmentIdによるデータ分離) の実装を含みます。

## Tech Stack

| Tool / Lib          | Version | Purpose                                                              |
| ------------------- | :-----: | -------------------------------------------------------------------- |
| **React**           |  19.x   | UIの土台。コンポーネント/フックで状態と表示を組み立てる              |
| **Next.js**         |  15.x   | フルスタックFW。App Router/SSR/SSG、動的ルーティング、メタデータ管理 |
| **TypeScript**      |   5.x   | 型安全・補完・リファクタリング                                       |
| **shadcn/ui**       | latest  | RadixベースのUIキット                                                |
| **Tailwind CSS**    |   4.x   | ユーティリティファーストCSSで素早くスタイリング                      |
| **Zod**             |   4.x   | スキーマ定義と実行時バリデーション                                   |
| **Playwright Test** | 1.54.x  | E2E テスト                                                           |
| **GitHub Actions**  |    —    | CI / HTML レポート保存                                               |

---

## クイックスタート

### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone https://github.com/delogs-jp/dashboard-format-fullstack.git
cd dashboard-format-fullstack

# 依存ライブラリ
npm install
```

### 2. データベースと環境変数の設定

本番同様、ローカル環境にも PostgreSQL データベースが必要です。

#### 2-1. データベースの作成

`psql`コマンドや各種GUIツール（例: DBeaver, TablePlus）を使い、空のデータベースを作成します。

```sql
-- 例：psql の場合
CREATE DATABASE delogs_format_demo
  WITH ENCODING 'UTF8'
      LC_COLLATE='ja_JP.UTF-8'
      LC_CTYPE='ja_JP.UTF-8'
      TEMPLATE=template0;
```

#### 2-2. .env ファイルの作成

.env.local （サンプル）をコピーして .env ファイルを作成し、DATABASE_URL を今作成したデータベース接続情報に書き換えてください。

```env
# .env ファイルの中身
# データベース接続情報を自身の環境に合わせて変更してください
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/delogs_format_demo"

# JWTの署名キー（変更推奨）
# openssl rand -base64 32
JWT_SECRET="your_secure_secret_key_here"

# セッションCookieの名前（任意。省略時は "session"）
SESSION_COOKIE_NAME=session

# Cookie と JWT の有効期限（秒）
# 例: 3600 = 1時間
SESSION_TTL_SECONDS=3600

# 失敗ロック関連
LOCK_THRESHOLD=5
LOCK_MINUTES=15

# 曖昧化モード（任意）
# detailed: 項目別エラー / ambiguous: 常に曖昧メッセージ
AUTH_ERROR_MODE=ambiguous

# アバターディレクトリの設定
# 環境に合わせて変更してください
AVATAR_DIR=/private/avatars

# メール設定
# 環境に合わせて変更してください
SMTP_HOST="mailsever"
SMTP_PORT="587"
SMTP_USER="sys@sample.com"
SMTP_PASS="password"
MAIL_FROM="システム通知 <no-reply@sample.com">"
APP_ORIGIN="https://sample.com"
```

### 3. 【重要】初回マイグレーションの実行

このプロジェクトは、Prismaの `dbgenerated` 機能とPostgreSQLのカスタム関数・シーケンスを組み合わせて、 `US00000001` のような表示IDを自動生成します。（prisma/schema.prisma 参照）

そのため、テーブルを作成する前に、カスタム関数等をDBに登録する必要があります。

#### 3-1. マイグレーションファイルの「生成」

まず、`--create-only` オプションを使い、マイグレーションファイルを「生成だけ」します。

```bash
npx prisma migrate dev --name init --create-only
```

コンソールに `prisma/migrations/xxxxxxxxxx_init/migration.sql` が生成された旨が表示されます。

#### 3-2. migration.sql の編集

生成された `prisma/migrations/xxxxxxxxxx_init/migration.sql` をエディタ（Cursor, VSCodeなど）で開きます。

ファイルの一番上（冒頭）に、以下のカスタム関数とシーケンス定義をコピー＆ペーストしてください。

```sql
/* ===== ここから追記 ===== */

-- 共通関数：シーケンスと接頭辞を受け取り、2文字 + 8桁ゼロ埋めのIDを生成
CREATE OR REPLACE FUNCTION public.generate_display_id(seq_name TEXT, prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  new_val BIGINT;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO new_val;
  RETURN prefix || lpad(new_val::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- displayId 用シーケンス作成
-- ===========================
CREATE SEQUENCE IF NOT EXISTS public.account_display_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.branch_display_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.department_display_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.contact_display_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.subscription_display_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.user_display_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.role_display_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.menu_display_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.department_role_display_id_seq;

/* ===== ここまで追記 ===== */

/*
  Warnings:
    ...
  ( ↓ 以下、Prismaが自動生成したSQLが続く ... )
*/
```

#### 3-3. マイグレーションの「適用」

`migration.sql` を保存したら、以下のコマンドで編集した内容をDBに適用します。

```bash
npx prisma migrate dev
```

Applying migration ... と表示されれば成功です。これでカスタム関数とテーブルがDBに正しく作成されました。

### 4. (推奨) 初期データの投入

RBAC（権限管理）のための共通ロールや、メニューの初期データを投入します。
seedデータを作成して、下記のコマンドを実行します。

```bash
npx prisma db seed
```

Seedスクリプト（seed.ts）の作成が難しい場合、GUIを使って手動でデータを登録することも可能です。
Role や Menu テーブルに必要なデータを入力してください。

```bash
npx prisma studio
```

【重要】 この方法で User（ユーザー）を作成する場合、hashedPassword カラムには argon2 でハッシュ化されたパスワード文字列を別途生成し、手動でペーストする必要があります。 平文のパスワードをそのまま入力してもログインできませんのでご注意ください。

ターミナルで以下のコマンドを実行すると、argon2 のハッシュ文字列を生成できます（your-password-here を実際のパスワードに置き換えてください）:

```bash
# 'your-password-here' をハッシュ化する場合
node -e "require('argon2').hash('your-password-here').then(console.log)"
```

※このコマンドは、npm install によって argon2 パッケージが node_modules にインストールされている必要がありますが、当パッケージには含まれています）

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセスしてください。

---

## e2eテスト

この記事では、e2eテストは範囲外ですが、ログイン画面についてテストする場合は下記を実行してください。
ログイン画面のみをe2eテストの対象にしています。

```bash
# Playwright ブラウザバイナリ (初回のみ)
npx playwright install --with-deps

# 開発サーバーは自動起動されるので不要
# そのままテスト実行
npx playwright test --reporter=html
npx playwright show-report  # レポートをブラウザで確認
```

- 環境によっては、`tests/login-form.spec.ts`のタイムアウト時間の調整が必要な場合があります。特に、safari回り。

---

## ライセンス

MIT

> サンプルのコードはご自由に利用 / 改変ください  
> （引用時はリンクいただけるとうれしいです 🙌）
> また、ご利用時は「DELOGs」サイトの [免責事項](https://delogs.jp/disclaimer) が適用されます。
> 感想やご意見など「DELOGs」サイトやXにてお寄せください

---

## 🙏 Credits / Author

- **DELOGs** – <https://delogs.jp>  
  技術ブログ × Web サービスで “届ける” 技術を探求中
- Twitter / X: [@DELOGs2506](https://x.com/DELOGs2506)
