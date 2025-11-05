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
CREATE TABLE "public"."DepartmentMenu" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "departmentId" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "isEnabled" BOOLEAN,
    "hiddenOverride" BOOLEAN,
    "sortOrder" INTEGER,
    "remarks" TEXT,

    CONSTRAINT "DepartmentMenu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentMenu_departmentId_idx" ON "public"."DepartmentMenu"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentMenu_menuId_idx" ON "public"."DepartmentMenu"("menuId");

-- CreateIndex
CREATE INDEX "DepartmentMenu_isEnabled_idx" ON "public"."DepartmentMenu"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMenu_departmentId_menuId_key" ON "public"."DepartmentMenu"("departmentId", "menuId");

-- AddForeignKey
ALTER TABLE "public"."DepartmentMenu" ADD CONSTRAINT "DepartmentMenu_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartmentMenu" ADD CONSTRAINT "DepartmentMenu_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "public"."Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
