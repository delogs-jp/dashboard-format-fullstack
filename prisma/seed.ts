// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

// ▼ 小道具：メールの正規化（小文字・trim）
const normalizeEmail = (email: string) => email.trim().toLowerCase();

// ▼ 今回の初期データ（必要に応じて .env 化）
const ORG = {
  accountName: "DELOGs株式会社",
  branchName: "本社",
  departmentName: "システム管理部",
  // 仕様: 15文字以上 / 大文字・小文字・数字を各1以上（推測困難）
  // 例: "Aa2024-Dept-Admin-01"（19文字、要件充足）
  departmentCode: "Aa2024-Dept-Admin-01",
};

const ADMIN = {
  email: "admin@example.com",
  password: "AdminPassword012345", // seed用の仮パスワード（本番は発行フローで都度生成）
  name: "管理者",
  roleCode: "ADMIN",
};

async function main() {
  // =====================================================
  // 1) Role（upsert）
  // =====================================================
  const roles = [
    {
      code: "ADMIN",
      name: "管理者",
      priority: 100,
      canEditData: true,
      canDownloadData: true,
      isSystem: true,
    },
    {
      code: "EDITOR",
      name: "編集者",
      priority: 50,
      canEditData: true,
      canDownloadData: false,
    },
    {
      code: "VIEWER",
      name: "閲覧者",
      priority: 10,
      canEditData: false,
      canDownloadData: false,
    },
  ];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        priority: r.priority,
        canEditData: r.canEditData,
        canDownloadData: r.canDownloadData,
        isSystem: !!r.isSystem,
        isActive: true,
      },
      create: {
        code: r.code,
        name: r.name,
        priority: r.priority,
        canEditData: r.canEditData,
        canDownloadData: r.canDownloadData,
        isSystem: !!r.isSystem,
        isActive: true,
      },
    });
  }

  // =====================================================
  // 2) SubscriptionPlan（upsert）
  // =====================================================
  const plans = [
    { code: "basic", name: "ベーシックプラン", monthlyPrice: 1000 },
    { code: "pro", name: "プロプラン", monthlyPrice: 5000 },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: { name: p.name, monthlyPrice: p.monthlyPrice, isActive: true },
      create: {
        code: p.code,
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        isActive: true,
      },
    });
  }

  // =====================================================
  // 3) SubscriptionStatus（upsert）
  // =====================================================
  const statuses = [
    { code: "active", name: "有効" },
    { code: "expired", name: "期限切れ" },
    { code: "pending", name: "審査中" },
  ];
  for (const s of statuses) {
    await prisma.subscriptionStatus.upsert({
      where: { code: s.code },
      update: { name: s.name, isActive: true },
      create: { code: s.code, name: s.name, isActive: true },
    });
  }

  // =====================================================
  // 4) 組織階層の用意（Account → Branch → Department）
  //     - name は UNIQUE ではないので、findFirst で再利用を試みる
  //     - Department は code UNIQUE を利用して upsert
  // =====================================================
  const account =
    (await prisma.account.findFirst({ where: { name: ORG.accountName } })) ??
    (await prisma.account.create({
      data: { name: ORG.accountName, isActive: true },
    }));

  const branch =
    (await prisma.branch.findFirst({
      where: { name: ORG.branchName, accountId: account.id },
    })) ??
    (await prisma.branch.create({
      data: { name: ORG.branchName, accountId: account.id, isActive: true },
    }));

  const department = await prisma.department.upsert({
    where: { code: ORG.departmentCode }, // UNIQUE
    update: {
      name: ORG.departmentName,
      branchId: branch.id,
      isActive: true,
    },
    create: {
      code: ORG.departmentCode,
      name: ORG.departmentName,
      branchId: branch.id,
      isActive: true,
    },
  });

  // =====================================================
  // 5) Department 契約（Subscription）を 1 件用意（status=active, plan=pro）
  // =====================================================
  const statusActive = await prisma.subscriptionStatus.findUnique({
    where: { code: "active" },
  });
  const planPro = await prisma.subscriptionPlan.findUnique({
    where: { code: "pro" },
  });

  if (!statusActive || !planPro) {
    throw new Error(
      "SubscriptionStatus(active) または SubscriptionPlan(pro) が見つかりません。",
    );
  }

  // 既に部署に active の購読が存在するなら作成スキップ（簡易判定）
  const existingSub = await prisma.subscription.findFirst({
    where: { departmentId: department.id, statusId: statusActive.id },
  });

  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        departmentId: department.id,
        statusId: statusActive.id,
        planId: planPro.id,
        startDate: new Date(),
        isActive: true,
      },
    });
  }

  // =====================================================
  // 6) 初期管理ユーザー（argon2 でハッシュ）
  //     - ログインは Department.code + User.email + password
  // =====================================================
  const adminRole = await prisma.role.findUnique({
    where: { code: ADMIN.roleCode },
  });
  if (!adminRole) throw new Error("ADMIN ロールが見つかりません。");

  const adminEmail = normalizeEmail(ADMIN.email);
  const adminHash = await argon2.hash(ADMIN.password);

  // 部署内メール一意（@@unique([departmentId, email])）で upsert
  // Prisma の upsert は複合Uniqueには直接使えないため、事前検索 → update or create の流れにします
  const existingAdmin = await prisma.user.findFirst({
    where: { departmentId: department.id, email: adminEmail },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: ADMIN.name,
        roleId: adminRole.id,
        hashedPassword: adminHash,
        isActive: true,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        departmentId: department.id,
        roleId: adminRole.id,
        email: adminEmail,
        hashedPassword: adminHash,
        name: ADMIN.name,
        isActive: true,
      },
    });
  }

  // （任意）Menu は UI 実装側の要件に合わせて別 Seed で投入すると管理しやすいです
}

main()
  .then(async () => {
    console.log("🌱 Seeding completed.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
