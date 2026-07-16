-- Add marketingOptIn (safe, has a default)
ALTER TABLE "User" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;

-- Add unsubscribeToken as nullable first, backfill with unique values, then tighten
ALTER TABLE "User" ADD COLUMN "unsubscribeToken" TEXT;
UPDATE "User" SET "unsubscribeToken" = replace(gen_random_uuid()::text, '-', '') WHERE "unsubscribeToken" IS NULL;
ALTER TABLE "User" ALTER COLUMN "unsubscribeToken" SET NOT NULL;
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");

-- name: make required + unique (existing rows already have distinct non-null names)
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
