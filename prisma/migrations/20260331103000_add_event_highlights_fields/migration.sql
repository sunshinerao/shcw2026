-- Add persisted AI-generated highlights fields on events
ALTER TABLE "events"
  ADD COLUMN "highlights" JSONB,
  ADD COLUMN "highlightsEn" JSONB,
  ADD COLUMN "highlightsGeneratedAt" TIMESTAMP(3);
