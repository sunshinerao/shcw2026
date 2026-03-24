-- AlterTable
ALTER TABLE "speakers" ADD COLUMN     "bioEn" TEXT,
ADD COLUMN     "organizationEn" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "sponsors" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "nameEn" TEXT;
