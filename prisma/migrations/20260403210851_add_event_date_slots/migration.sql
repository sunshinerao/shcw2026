-- CreateTable
CREATE TABLE "event_date_slots" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "scheduleDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_date_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_date_slots_eventId_scheduleDate_idx" ON "event_date_slots"("eventId", "scheduleDate");

-- CreateIndex
CREATE UNIQUE INDEX "event_date_slots_eventId_scheduleDate_key" ON "event_date_slots"("eventId", "scheduleDate");

-- AddForeignKey
ALTER TABLE "event_date_slots" ADD CONSTRAINT "event_date_slots_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
