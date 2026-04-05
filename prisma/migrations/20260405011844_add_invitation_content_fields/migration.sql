-- DropIndex
DROP INDEX "faq_items_isPublished_isPinned_sortOrder_idx";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "invitationContentHtml_en" TEXT,
ADD COLUMN     "invitationContentHtml_zh" TEXT;

-- AlterTable
ALTER TABLE "faq_items" ALTER COLUMN "category" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invitation_requests" ADD COLUMN     "customMainContent" TEXT;
