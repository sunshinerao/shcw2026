-- AlterTable
ALTER TABLE "faq_items"
ADD COLUMN "category" TEXT NOT NULL DEFAULT '其他问题',
ADD COLUMN "categoryEn" TEXT;

-- Backfill categories for seeded FAQ items
UPDATE "faq_items" SET "category" = '注册与参会', "categoryEn" = 'Registration & Participation'
WHERE "id" IN ('faq-register', 'faq-fee', 'faq-speaker-partner');

UPDATE "faq_items" SET "category" = '活动与日程', "categoryEn" = 'Events & Schedule'
WHERE "id" IN ('faq-schedule', 'faq-cancel-registration', 'faq-online');

UPDATE "faq_items" SET "category" = '场馆与交通', "categoryEn" = 'Venue & Transportation'
WHERE "id" IN ('faq-venue', 'faq-transport');

-- Replace fallback values for any older records
UPDATE "faq_items"
SET "category" = '其他问题'
WHERE "category" IS NULL OR BTRIM("category") = '';

-- CreateIndex
CREATE INDEX "faq_items_category_isPublished_isPinned_sortOrder_idx" ON "faq_items"("category", "isPublished", "isPinned", "sortOrder");