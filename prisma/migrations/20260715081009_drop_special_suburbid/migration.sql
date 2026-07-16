-- DropForeignKey
ALTER TABLE "Special" DROP CONSTRAINT "Special_suburbId_fkey";

-- DropIndex
DROP INDEX "Special_suburbId_idx";

-- AlterTable
ALTER TABLE "Special" DROP COLUMN "suburbId";

