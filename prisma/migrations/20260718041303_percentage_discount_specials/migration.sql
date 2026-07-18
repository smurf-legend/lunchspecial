-- AlterTable
ALTER TABLE "Special" ADD COLUMN     "discountPercent" INTEGER,
ALTER COLUMN "specialPrice" DROP NOT NULL;
