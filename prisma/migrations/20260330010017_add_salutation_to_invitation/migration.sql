-- AlterEnum
ALTER TYPE "RegistrationStatus" ADD VALUE 'WAITLIST';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'VERIFIER';

-- AlterTable
ALTER TABLE "invitation_requests" ADD COLUMN     "salutation" TEXT;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
