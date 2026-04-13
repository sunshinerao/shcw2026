-- AlterTable
ALTER TABLE "speakers" ADD COLUMN     "countryOrRegion" TEXT,
ADD COLUMN     "countryOrRegionEn" TEXT,
ADD COLUMN     "expertiseTags" JSONB,
ADD COLUMN     "relevanceToShcw" TEXT,
ADD COLUMN     "relevanceToShcwEn" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summaryEn" TEXT;
