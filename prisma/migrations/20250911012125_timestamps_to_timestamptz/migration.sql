-- AlterTable
ALTER TABLE "public"."Account" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('account_display_id_seq','AC'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."Branch" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('branch_display_id_seq','BR'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."Contact" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('contact_display_id_seq','CT'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."Department" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('department_display_id_seq','DP'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."Menu" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('menu_display_id_seq','MN'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."Role" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('role_display_id_seq','RL'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."Session" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "revokedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."Subscription" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('subscription_display_id_seq','SB'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."SubscriptionPlan" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."SubscriptionStatus" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "displayId" SET DEFAULT generate_display_id('user_display_id_seq','US'),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "lockedUntil" SET DATA TYPE TIMESTAMPTZ;
