-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Special" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;
