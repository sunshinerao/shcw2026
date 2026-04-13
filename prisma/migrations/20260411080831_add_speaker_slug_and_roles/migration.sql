/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `speakers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "speakers" ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "speaker_roles" (
    "id" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "organization" TEXT NOT NULL,
    "organizationEn" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "speaker_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "speakers_slug_key" ON "speakers"("slug");

-- AddForeignKey
ALTER TABLE "speaker_roles" ADD CONSTRAINT "speaker_roles_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "speakers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
