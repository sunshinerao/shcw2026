-- CreateTable
CREATE TABLE "sponsorship_tiers" (
    "id" TEXT NOT NULL,
    "tierType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT,
    "descriptionEn" TEXT,
    "price" TEXT,
    "features" JSONB NOT NULL,
    "featuresEn" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorship_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_tiers_tierType_key" ON "sponsorship_tiers"("tierType");
