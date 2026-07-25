-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BlogPost_publishAt_idx" ON "BlogPost"("publishAt");
