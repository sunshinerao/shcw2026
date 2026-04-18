/*
  Warnings:

  - A unique constraint covering the columns `[venueCheckinSecret]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "venueCheckinSecret" TEXT;

-- CreateTable
CREATE TABLE "event_verifiers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_verifiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_verifiers_userId_idx" ON "event_verifiers"("userId");

-- CreateIndex
CREATE INDEX "event_verifiers_eventId_idx" ON "event_verifiers"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_verifiers_userId_eventId_key" ON "event_verifiers"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "events_venueCheckinSecret_key" ON "events"("venueCheckinSecret");

-- AddForeignKey
ALTER TABLE "event_verifiers" ADD CONSTRAINT "event_verifiers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_verifiers" ADD CONSTRAINT "event_verifiers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
