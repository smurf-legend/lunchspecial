-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredCategorySlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferredSuburbId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_preferredSuburbId_fkey" FOREIGN KEY ("preferredSuburbId") REFERENCES "Suburb"("id") ON DELETE SET NULL ON UPDATE CASCADE;
