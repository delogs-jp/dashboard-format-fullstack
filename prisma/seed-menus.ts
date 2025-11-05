// prisma/seed-menus.ts
import { PrismaClient, MenuMatchMode } from "@prisma/client";

const prisma = new PrismaClient();

/** メニュー定義（displayIdはDBに任せる） */
type SeedMenu = {
  key: string; // 内部キーとして使う（旧displayId相当）
  parentKey: string | null;
  order: number;
  title: string;
  href?: string;
  iconName?: string;
  match: "exact" | "prefix" | "regex";
  pattern?: string;
  minPriority?: number;
  isSection: boolean;
  isActive: boolean;
  hidden: boolean;
  lockHiddenOverride: boolean;
};

const SEED_MENUS: SeedMenu[] = [
  {
    key: "root-dashboard",
    parentKey: null,
    order: 0,
    title: "ダッシュボード",
    iconName: "SquareTerminal",
    match: "prefix",
    isSection: true,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "root-docs",
    parentKey: null,
    order: 1,
    title: "ドキュメント",
    iconName: "BookOpen",
    match: "prefix",
    isSection: true,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "root-settings",
    parentKey: null,
    order: 2,
    title: "設定",
    iconName: "Settings2",
    match: "prefix",
    minPriority: 100,
    isSection: true,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "root-personal",
    parentKey: null,
    order: 3,
    title: "個人設定",
    iconName: "Settings2",
    match: "prefix",
    isSection: true,
    isActive: true,
    hidden: true,
    lockHiddenOverride: false,
  },
  {
    key: "dashboard-overview",
    parentKey: "root-dashboard",
    order: 0,
    title: "概要",
    href: "/dashboard",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "docs-tutorial",
    parentKey: "root-docs",
    order: 0,
    title: "チュートリアル",
    href: "/tutorial",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "docs-changelog",
    parentKey: "root-docs",
    order: 1,
    title: "更新履歴",
    href: "/changelog",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "settings-masters",
    parentKey: "root-settings",
    order: 0,
    title: "マスタ管理",
    href: "/masters",
    match: "prefix",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "settings-users",
    parentKey: "root-settings",
    order: 1,
    title: "ユーザ管理",
    href: "/users",
    match: "prefix",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "masters-list",
    parentKey: "settings-masters",
    order: 0,
    title: "マスタ一覧",
    href: "/masters",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "masters-roles",
    parentKey: "settings-masters",
    order: 1,
    title: "ロール管理",
    href: "/masters/roles",
    match: "prefix",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "masters-menus",
    parentKey: "settings-masters",
    order: 2,
    title: "メニュー管理",
    href: "/masters/menus",
    match: "prefix",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "users-list",
    parentKey: "settings-users",
    order: 0,
    title: "一覧",
    href: "/users",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "users-new",
    parentKey: "settings-users",
    order: 1,
    title: "新規登録",
    href: "/users/new",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: true,
    lockHiddenOverride: false,
  },
  {
    key: "users-password",
    parentKey: "settings-users",
    order: 2,
    title: "パスワード再発行",
    href: "/users/password-request",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "users-email-change",
    parentKey: "settings-users",
    order: 3,
    title: "メールアドレス変更の承認",
    href: "/users/email-change-requests",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: false,
    lockHiddenOverride: false,
  },
  {
    key: "personal-profile",
    parentKey: "root-personal",
    order: 0,
    title: "プロフィール編集",
    href: "/profile",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: true,
    lockHiddenOverride: false,
  },
  {
    key: "personal-email",
    parentKey: "personal-profile",
    order: 0,
    title: "メールアドレス変更",
    href: "/profile/email",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: true,
    lockHiddenOverride: false,
  },
  {
    key: "personal-password",
    parentKey: "personal-profile",
    order: 1,
    title: "パスワード変更",
    href: "/profile/password",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: true,
    lockHiddenOverride: false,
  },
  {
    key: "personal-verify",
    parentKey: "personal-profile",
    order: 2,
    title: "メールアドレス変更の確認",
    href: "/profile/email/verify",
    match: "exact",
    isSection: false,
    isActive: true,
    hidden: true,
    lockHiddenOverride: false,
  },
];

async function main() {
  console.log("🌱 Seeding Menus (auto displayId)...");

  const idByKey = new Map<string, string>();

  for (const m of SEED_MENUS) {
    const parentId = m.parentKey ? (idByKey.get(m.parentKey) ?? null) : null;

    const record = await prisma.menu.create({
      data: {
        parentId,
        title: m.title,
        href: m.isSection ? null : (m.href ?? null),
        isExternal: null,
        iconName: m.iconName ?? null,
        match: m.match as MenuMatchMode,
        pattern: m.pattern ?? null,
        minPriority: m.minPriority ?? null,
        isSection: m.isSection,
        sortOrder: m.order,
        remarks: null,
        hidden: m.hidden,
        lockHiddenOverride: m.lockHiddenOverride,
        isActive: m.isActive,
      },
      select: { id: true, displayId: true },
    });

    idByKey.set(m.key, record.id);
    console.log(`  + ${m.title} (${record.displayId})`);
  }

  console.log("✅ Menus seeded successfully.");
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Menu seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
