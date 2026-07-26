-- AlterTable
ALTER TABLE "Special" ADD COLUMN     "membersOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryAvailable" BOOLEAN NOT NULL DEFAULT false;
