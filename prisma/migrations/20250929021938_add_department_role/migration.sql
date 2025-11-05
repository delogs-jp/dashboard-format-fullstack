-- （追記）displayId用シーケンスを先に作成
CREATE SEQUENCE IF NOT EXISTS "public".department_role_display_id_seq;

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
ALTER TABLE "public"."User" ADD COLUMN     "departmentRoleId" TEXT,
ALTER COLUMN "displayId" SET DEFAULT generate_display_id('user_display_id_seq','US');

-- （追記）User の XOR制約（roleId と departmentRoleId の同時指定禁止）
ALTER TABLE "public"."User"
  ADD CONSTRAINT user_role_xor CHECK (
    ("roleId" IS NOT NULL) <> ("departmentRoleId" IS NOT NULL)
  );

-- CreateTable
CREATE TABLE "public"."DepartmentRole" (
    "id" TEXT NOT NULL,
    "displayId" VARCHAR(10) NOT NULL DEFAULT generate_display_id('department_role_display_id_seq','DR'),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "departmentId" TEXT NOT NULL,
    "roleId" TEXT,
    "nameOverride" TEXT,
    "badgeColorOverride" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "code" VARCHAR(50),
    "name" TEXT,
    "priority" INTEGER,
    "badgeColor" TEXT,
    "canDownloadData" BOOLEAN,
    "canEditData" BOOLEAN,
    "isSystem" BOOLEAN,
    "remarks" TEXT,

    CONSTRAINT "DepartmentRole_pkey" PRIMARY KEY ("id")
);

-- （追記）DepartmentRole の priority 制約
ALTER TABLE "public"."DepartmentRole"
  ADD CONSTRAINT department_role_priority_cap CHECK (
    "priority" IS NULL OR "priority" <= 99
  );

-- （追記）DepartmentRole の override/custom XOR制約
ALTER TABLE "public"."DepartmentRole"
  ADD CONSTRAINT department_role_mode_check CHECK (
    (
      "roleId" IS NOT NULL AND
      "code" IS NULL AND "name" IS NULL AND "priority" IS NULL AND
      "badgeColor" IS NULL AND "canDownloadData" IS NULL AND "canEditData" IS NULL AND "isSystem" IS NULL
    )
    OR
    (
      "roleId" IS NULL AND
      "code" IS NOT NULL AND "name" IS NOT NULL AND "priority" IS NOT NULL
    )
  );

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentRole_displayId_key" ON "public"."DepartmentRole"("displayId");

-- CreateIndex
CREATE INDEX "DepartmentRole_departmentId_idx" ON "public"."DepartmentRole"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentRole_roleId_idx" ON "public"."DepartmentRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentRole_departmentId_roleId_key" ON "public"."DepartmentRole"("departmentId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentRole_departmentId_code_key" ON "public"."DepartmentRole"("departmentId", "code");

-- CreateIndex
CREATE INDEX "User_departmentRoleId_idx" ON "public"."User"("departmentRoleId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_departmentRoleId_fkey" FOREIGN KEY ("departmentRoleId") REFERENCES "public"."DepartmentRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartmentRole" ADD CONSTRAINT "DepartmentRole_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartmentRole" ADD CONSTRAINT "DepartmentRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
