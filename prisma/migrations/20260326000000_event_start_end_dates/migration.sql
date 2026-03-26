-- Rename date → startDate, add endDate (default to startDate value)
ALTER TABLE "events" RENAME COLUMN "date" TO "startDate";
ALTER TABLE "events" ADD COLUMN "endDate" TIMESTAMP(3);
UPDATE "events" SET "endDate" = "startDate" WHERE "endDate" IS NULL;
ALTER TABLE "events" ALTER COLUMN "endDate" SET NOT NULL;

-- Update index
DROP INDEX IF EXISTS "events_date_idx";
CREATE INDEX "events_startDate_idx" ON "events"("startDate");
