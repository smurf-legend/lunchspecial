-- CreateTable
CREATE TABLE "GoogleOAuthCredential" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleOAuthCredential_pkey" PRIMARY KEY ("id")
);
