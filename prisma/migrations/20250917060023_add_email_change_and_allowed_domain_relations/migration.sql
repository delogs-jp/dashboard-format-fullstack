-- CreateEnum
CREATE TYPE "public"."EmailChangeStatus" AS ENUM ('PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "public"."Account" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('account_display_id_seq','AC');

-- AlterTable
ALTER TABLE "public"."Branch" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('branch_display_id_seq','BR');

-- AlterTable
ALTER TABLE "public"."Contact" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('contact_display_id_seq','CT');

-- AlterTable
ALTER TABLE "public"."Department" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('department_display_id_seq','DP');

-- AlterTable
ALTER TABLE "public"."Menu" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('menu_display_id_seq','MN');

-- AlterTable
ALTER TABLE "public"."Role" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('role_display_id_seq','RL');

-- AlterTable
ALTER TABLE "public"."Subscription" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('subscription_display_id_seq','SB');

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('user_display_id_seq','US');

-- CreateTable
CREATE TABLE "public"."EmailChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "newEmailPuny" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "public"."EmailChangeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ,
    "processedBy" TEXT,

    CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AllowedEmailDomain" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "domainAscii" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AllowedEmailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeRequest_token_key" ON "public"."EmailChangeRequest"("token");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_userId_idx" ON "public"."EmailChangeRequest"("userId");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_departmentId_idx" ON "public"."EmailChangeRequest"("departmentId");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_status_idx" ON "public"."EmailChangeRequest"("status");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_expiresAt_idx" ON "public"."EmailChangeRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "AllowedEmailDomain_departmentId_idx" ON "public"."AllowedEmailDomain"("departmentId");

-- CreateIndex
CREATE INDEX "AllowedEmailDomain_isActive_idx" ON "public"."AllowedEmailDomain"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedEmailDomain_departmentId_domainAscii_key" ON "public"."AllowedEmailDomain"("departmentId", "domainAscii");

-- AddForeignKey
ALTER TABLE "public"."EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AllowedEmailDomain" ADD CONSTRAINT "AllowedEmailDomain_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
