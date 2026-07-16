-- AlterTable
ALTER TABLE "Special" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Special_expiresAt_idx" ON "Special"("expiresAt");
