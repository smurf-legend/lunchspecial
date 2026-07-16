-- CreateTable
CREATE TABLE "SpecialSuburb" (
    "specialId" TEXT NOT NULL,
    "suburbId" TEXT NOT NULL,

    CONSTRAINT "SpecialSuburb_pkey" PRIMARY KEY ("specialId","suburbId")
);

-- CreateIndex
CREATE INDEX "SpecialSuburb_suburbId_idx" ON "SpecialSuburb"("suburbId");

-- AddForeignKey
ALTER TABLE "SpecialSuburb" ADD CONSTRAINT "SpecialSuburb_specialId_fkey" FOREIGN KEY ("specialId") REFERENCES "Special"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialSuburb" ADD CONSTRAINT "SpecialSuburb_suburbId_fkey" FOREIGN KEY ("suburbId") REFERENCES "Suburb"("id") ON DELETE CASCADE ON UPDATE CASCADE;
