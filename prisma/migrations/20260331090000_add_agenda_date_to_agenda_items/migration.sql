ALTER TABLE "agenda_items" ADD COLUMN "agendaDate" TIMESTAMP(3);

UPDATE "agenda_items" AS ai
SET "agendaDate" = e."startDate"
FROM "events" AS e
WHERE ai."eventId" = e."id";

ALTER TABLE "agenda_items" ALTER COLUMN "agendaDate" SET NOT NULL;

CREATE INDEX "agenda_items_eventId_agendaDate_idx" ON "agenda_items"("eventId", "agendaDate");