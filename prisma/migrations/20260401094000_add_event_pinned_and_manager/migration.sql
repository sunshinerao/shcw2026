-- Add pinned flag and per-event manager assignment
ALTER TABLE "events"
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "managerUserId" TEXT;

CREATE INDEX "events_managerUserId_idx" ON "events"("managerUserId");
CREATE INDEX "events_isPinned_startDate_startTime_idx" ON "events"("isPinned", "startDate", "startTime");

ALTER TABLE "events"
  ADD CONSTRAINT "events_managerUserId_fkey"
  FOREIGN KEY ("managerUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
