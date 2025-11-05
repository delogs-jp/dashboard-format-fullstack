-- AlterTable
ALTER TABLE "public"."Account" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('account_display_id_seq','AC');

-- AlterTable
ALTER TABLE "public"."Branch" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('branch_display_id_seq','BR');

-- AlterTable
ALTER TABLE "public"."Contact" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('contact_display_id_seq','CT');

-- AlterTable
ALTER TABLE "public"."Department" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('department_display_id_seq','DP');

-- AlterTable
ALTER TABLE "public"."Menu" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "displayId" SET DEFAULT generate_display_id('menu_display_id_seq','MN');

-- AlterTable
ALTER TABLE "public"."Role" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('role_display_id_seq','RL');

-- AlterTable
ALTER TABLE "public"."Subscription" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('subscription_display_id_seq','SB');

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('user_display_id_seq','US');

-- CreateIndex
CREATE INDEX "Menu_hidden_idx" ON "public"."Menu"("hidden");
