-- CreateEnum
CREATE TYPE "public"."PasswordRequestStatus" AS ENUM ('PENDING', 'ISSUED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."Account" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('account_display_id_seq','AC');

-- AlterTable
ALTER TABLE "public"."Branch" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('branch_display_id_seq','BR');

-- AlterTable
ALTER TABLE "public"."Contact" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('contact_display_id_seq','CT');

-- AlterTable
ALTER TABLE "public"."Department" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('department_display_id_seq','DP');

-- AlterTable
ALTER TABLE "public"."DepartmentRole" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('department_role_display_id_seq','DR');

-- AlterTable
ALTER TABLE "public"."Menu" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('menu_display_id_seq','MN');

-- AlterTable
ALTER TABLE "public"."Role" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('role_display_id_seq','RL');

-- AlterTable
ALTER TABLE "public"."Subscription" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('subscription_display_id_seq','SB');

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('user_display_id_seq','US');

-- CreateTable
CREATE TABLE "public"."PasswordRequest" (
    "id" TEXT NOT NULL,
    "departmentCodeInput" TEXT NOT NULL,
    "emailPuny" TEXT NOT NULL,
    "note" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "departmentId" TEXT,
    "userId" TEXT,
    "status" "public"."PasswordRequestStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMPTZ,
    "processedBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PasswordRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordRequest_departmentId_emailPuny_idx" ON "public"."PasswordRequest"("departmentId", "emailPuny");

-- CreateIndex
CREATE INDEX "PasswordRequest_departmentCodeInput_idx" ON "public"."PasswordRequest"("departmentCodeInput");

-- CreateIndex
CREATE INDEX "PasswordRequest_status_idx" ON "public"."PasswordRequest"("status");

-- CreateIndex
CREATE INDEX "PasswordRequest_createdAt_idx" ON "public"."PasswordRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."PasswordRequest" ADD CONSTRAINT "PasswordRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordRequest" ADD CONSTRAINT "PasswordRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
