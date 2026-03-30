-- AlterEnum (idempotent - IF NOT EXISTS supported in PG 12+)
ALTER TYPE "RegistrationStatus" ADD VALUE IF NOT EXISTS 'WAITLIST';

-- AlterEnum (idempotent)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VERIFIER';

-- AlterTable
ALTER TABLE "invitation_requests" ADD COLUMN IF NOT EXISTS "salutation" TEXT;

-- AlterTable (speaker salutation)
ALTER TABLE "speakers" ADD COLUMN IF NOT EXISTS "salutation" TEXT;

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'point_transactions_eventId_fkey') THEN
    ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
