-- AlterTable
ALTER TABLE "Special" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsReviewNote" TEXT;
