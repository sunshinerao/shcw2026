-- CreateEnum
CREATE TYPE "SpecialPassStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SpecialPassEntryType" AS ENUM ('DOMESTIC', 'INTERNATIONAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "special_passes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryType" "SpecialPassEntryType" NOT NULL,
    "status" "SpecialPassStatus" NOT NULL DEFAULT 'PENDING',
    "country" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "docNumber" TEXT NOT NULL,
    "docValidFrom" TEXT NOT NULL,
    "docValidTo" TEXT NOT NULL,
    "docPhoto" TEXT,
    "photo" TEXT,
    "organization" TEXT,
    "jobTitle" TEXT,
    "docType" TEXT,
    "email" TEXT,
    "phoneArea" TEXT,
    "phone" TEXT,
    "contactMethod" TEXT,
    "contactValue" TEXT,
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_passes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "special_passes_userId_idx" ON "special_passes"("userId");

-- CreateIndex
CREATE INDEX "special_passes_status_idx" ON "special_passes"("status");

-- CreateIndex
CREATE INDEX "special_passes_entryType_idx" ON "special_passes"("entryType");

-- AddForeignKey
ALTER TABLE "special_passes" ADD CONSTRAINT "special_passes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
