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

-- CreateEnum
CREATE TYPE "public"."MenuMatchMode" AS ENUM ('exact', 'prefix', 'regex');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('account_display_id_seq','AC'),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "headquartersAddress" TEXT,
    "invoiceNumber" TEXT,
    "remarks" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Branch" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('branch_display_id_seq','BR'),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "remarks" TEXT,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('department_display_id_seq','DP'),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "remarks" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('contact_display_id_seq','CT'),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "duty" TEXT,
    "remarks" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('subscription_display_id_seq','SB'),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "departmentId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "remarks" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionStatus" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SubscriptionStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(65,30),

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('role_display_id_seq','RL'),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "badgeColor" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "canDownloadData" BOOLEAN NOT NULL,
    "canEditData" BOOLEAN NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('user_display_id_seq','US'),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "departmentId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "remarks" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Menu" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('menu_display_id_seq','MN'),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "href" TEXT,
    "isExternal" BOOLEAN,
    "iconName" TEXT,
    "match" "public"."MenuMatchMode" NOT NULL,
    "pattern" TEXT,
    "minPriority" INTEGER,
    "isSection" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_displayId_key" ON "public"."Account"("displayId");

-- CreateIndex
CREATE INDEX "Account_isActive_idx" ON "public"."Account"("isActive");

-- CreateIndex
CREATE INDEX "Account_createdAt_idx" ON "public"."Account"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_displayId_key" ON "public"."Branch"("displayId");

-- CreateIndex
CREATE INDEX "Branch_accountId_idx" ON "public"."Branch"("accountId");

-- CreateIndex
CREATE INDEX "Branch_isActive_idx" ON "public"."Branch"("isActive");

-- CreateIndex
CREATE INDEX "Branch_createdAt_idx" ON "public"."Branch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Department_displayId_key" ON "public"."Department"("displayId");

-- CreateIndex
CREATE INDEX "Department_branchId_idx" ON "public"."Department"("branchId");

-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "public"."Department"("isActive");

-- CreateIndex
CREATE INDEX "Department_createdAt_idx" ON "public"."Department"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_displayId_key" ON "public"."Contact"("displayId");

-- CreateIndex
CREATE INDEX "Contact_departmentId_idx" ON "public"."Contact"("departmentId");

-- CreateIndex
CREATE INDEX "Contact_isActive_idx" ON "public"."Contact"("isActive");

-- CreateIndex
CREATE INDEX "Contact_createdAt_idx" ON "public"."Contact"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_displayId_key" ON "public"."Subscription"("displayId");

-- CreateIndex
CREATE INDEX "Subscription_departmentId_idx" ON "public"."Subscription"("departmentId");

-- CreateIndex
CREATE INDEX "Subscription_statusId_idx" ON "public"."Subscription"("statusId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "public"."Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_startDate_idx" ON "public"."Subscription"("startDate");

-- CreateIndex
CREATE INDEX "Subscription_isActive_idx" ON "public"."Subscription"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionStatus_code_key" ON "public"."SubscriptionStatus"("code");

-- CreateIndex
CREATE INDEX "SubscriptionStatus_isActive_idx" ON "public"."SubscriptionStatus"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "public"."SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_idx" ON "public"."SubscriptionPlan"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_displayId_key" ON "public"."Role"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "public"."Role"("code");

-- CreateIndex
CREATE INDEX "Role_priority_idx" ON "public"."Role"("priority");

-- CreateIndex
CREATE INDEX "Role_isActive_idx" ON "public"."Role"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_displayId_key" ON "public"."User"("displayId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "public"."User"("departmentId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "public"."User"("roleId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "public"."User"("isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_departmentId_email_key" ON "public"."User"("departmentId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_displayId_key" ON "public"."Menu"("displayId");

-- CreateIndex
CREATE INDEX "Menu_parentId_idx" ON "public"."Menu"("parentId");

-- CreateIndex
CREATE INDEX "Menu_minPriority_idx" ON "public"."Menu"("minPriority");

-- CreateIndex
CREATE INDEX "Menu_isActive_idx" ON "public"."Menu"("isActive");

-- CreateIndex
CREATE INDEX "Menu_sortOrder_idx" ON "public"."Menu"("sortOrder");

-- CreateIndex
CREATE INDEX "Menu_createdAt_idx" ON "public"."Menu"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Branch" ADD CONSTRAINT "Branch_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "public"."SubscriptionStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Menu" ADD CONSTRAINT "Menu_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
