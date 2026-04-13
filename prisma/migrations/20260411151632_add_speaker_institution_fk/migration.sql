-- AlterTable
ALTER TABLE "speakers" ADD COLUMN     "institutionId" TEXT;

-- AddForeignKey
ALTER TABLE "speakers" ADD CONSTRAINT "speakers_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
