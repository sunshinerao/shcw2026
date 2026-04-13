-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "shortName" TEXT,
    "shortNameEn" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "orgType" TEXT,
    "countryOrRegion" TEXT,
    "countryOrRegionEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "collaborationBg" TEXT,
    "collaborationBgEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_relationships" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'annual',
    "sponsorLevel" TEXT,
    "trackId" TEXT,
    "displaySection" TEXT,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "benefitsJson" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_institutions" (
    "eventId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "role" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_institutions_pkey" PRIMARY KEY ("eventId","institutionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_slug_key" ON "institutions"("slug");

-- CreateIndex
CREATE INDEX "institutions_slug_idx" ON "institutions"("slug");

-- CreateIndex
CREATE INDEX "institutions_isActive_order_idx" ON "institutions"("isActive", "order");

-- CreateIndex
CREATE INDEX "institution_relationships_institutionId_idx" ON "institution_relationships"("institutionId");

-- CreateIndex
CREATE INDEX "institution_relationships_type_idx" ON "institution_relationships"("type");

-- CreateIndex
CREATE INDEX "institution_relationships_scope_idx" ON "institution_relationships"("scope");

-- CreateIndex
CREATE INDEX "institution_relationships_trackId_idx" ON "institution_relationships"("trackId");

-- CreateIndex
CREATE INDEX "institution_relationships_showOnHomepage_priority_idx" ON "institution_relationships"("showOnHomepage", "priority");

-- CreateIndex
CREATE INDEX "event_institutions_eventId_idx" ON "event_institutions"("eventId");

-- CreateIndex
CREATE INDEX "event_institutions_institutionId_idx" ON "event_institutions"("institutionId");

-- AddForeignKey
ALTER TABLE "institution_relationships" ADD CONSTRAINT "institution_relationships_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_relationships" ADD CONSTRAINT "institution_relationships_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_institutions" ADD CONSTRAINT "event_institutions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_institutions" ADD CONSTRAINT "event_institutions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
