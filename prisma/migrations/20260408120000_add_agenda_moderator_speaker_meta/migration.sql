-- AlterTable: add moderatorId and speakerMeta to agenda_items
ALTER TABLE "agenda_items" ADD COLUMN "moderatorId" TEXT;
ALTER TABLE "agenda_items" ADD COLUMN "speakerMeta" JSONB;

-- AddForeignKey
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "speakers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "agenda_items_moderatorId_idx" ON "agenda_items"("moderatorId");
