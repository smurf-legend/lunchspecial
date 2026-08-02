-- DropIndex
DROP INDEX "Special_title_trgm_idx";

-- DropIndex
DROP INDEX "Special_venueName_trgm_idx";

-- CreateTable
CREATE TABLE "AnalyticsDigestLog" (
    "id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsDigestLog_pkey" PRIMARY KEY ("id")
);
