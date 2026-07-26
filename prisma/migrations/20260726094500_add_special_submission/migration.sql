-- CreateTable
CREATE TABLE "SpecialSubmission" (
    "id" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "link" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "SpecialSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecialSubmission_status_idx" ON "SpecialSubmission"("status");

-- CreateIndex
CREATE INDEX "SpecialSubmission_createdAt_idx" ON "SpecialSubmission"("createdAt");
