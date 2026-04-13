-- CreateEnum
CREATE TYPE "KnowledgeAssetType" AS ENUM ('WHITE_PAPER', 'REPORT', 'INITIATIVE', 'POLICY_BRIEF', 'GUIDE', 'DECLARATION', 'SUMMARY');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('PUBLIC', 'LOGIN_REQUIRED', 'PAID', 'HIDDEN');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PosterTemplateType" AS ENUM ('EVENT', 'SPEAKER', 'AGENDA', 'SOCIAL_CARD', 'KNOWLEDGE');

-- CreateEnum
CREATE TYPE "PosterJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "knowledge_assets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "subtitle" TEXT,
    "subtitleEn" TEXT,
    "slug" TEXT NOT NULL,
    "type" "KnowledgeAssetType" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "coverImage" TEXT,
    "publishDate" TIMESTAMP(3),
    "summary" TEXT,
    "summaryEn" TEXT,
    "content" TEXT,
    "contentEn" TEXT,
    "keyPoints" JSONB,
    "keyPointsEn" JSONB,
    "references" JSONB,
    "fileUrl" TEXT,
    "fileFormat" TEXT,
    "fileSize" INTEGER,
    "accessType" "AccessType" NOT NULL DEFAULT 'PUBLIC',
    "price" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'CNY',
    "downloadEnabled" BOOLEAN NOT NULL DEFAULT true,
    "previewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "previewPages" INTEGER,
    "watermark" BOOLEAN NOT NULL DEFAULT false,
    "doi" TEXT,
    "citation" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_asset_versions" (
    "id" TEXT NOT NULL,
    "knowledgeAssetId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "changeLog" TEXT,
    "contentSnapshot" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_asset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_asset_events" (
    "knowledgeAssetId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "knowledge_asset_events_pkey" PRIMARY KEY ("knowledgeAssetId","eventId")
);

-- CreateTable
CREATE TABLE "knowledge_asset_institutions" (
    "knowledgeAssetId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,

    CONSTRAINT "knowledge_asset_institutions_pkey" PRIMARY KEY ("knowledgeAssetId","institutionId")
);

-- CreateTable
CREATE TABLE "knowledge_asset_speakers" (
    "knowledgeAssetId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,

    CONSTRAINT "knowledge_asset_speakers_pkey" PRIMARY KEY ("knowledgeAssetId","speakerId")
);

-- CreateTable
CREATE TABLE "knowledge_asset_tracks" (
    "knowledgeAssetId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "knowledge_asset_tracks_pkey" PRIMARY KEY ("knowledgeAssetId","trackId")
);

-- CreateTable
CREATE TABLE "poster_templates" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateType" "PosterTemplateType" NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "layoutJson" JSONB NOT NULL,
    "background" TEXT,
    "fontConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poster_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_jobs" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "knowledgeAssetId" TEXT,
    "eventId" TEXT,
    "speakerId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'zh',
    "outputFormat" TEXT NOT NULL DEFAULT 'png',
    "outputUrl" TEXT,
    "status" "PosterJobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poster_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_assets_slug_key" ON "knowledge_assets"("slug");

-- CreateIndex
CREATE INDEX "knowledge_assets_slug_idx" ON "knowledge_assets"("slug");

-- CreateIndex
CREATE INDEX "knowledge_assets_status_publishDate_idx" ON "knowledge_assets"("status", "publishDate");

-- CreateIndex
CREATE INDEX "knowledge_assets_type_sortOrder_idx" ON "knowledge_assets"("type", "sortOrder");

-- CreateIndex
CREATE INDEX "knowledge_asset_versions_knowledgeAssetId_idx" ON "knowledge_asset_versions"("knowledgeAssetId");

-- CreateIndex
CREATE INDEX "knowledge_asset_events_eventId_idx" ON "knowledge_asset_events"("eventId");

-- CreateIndex
CREATE INDEX "knowledge_asset_institutions_institutionId_idx" ON "knowledge_asset_institutions"("institutionId");

-- CreateIndex
CREATE INDEX "knowledge_asset_speakers_speakerId_idx" ON "knowledge_asset_speakers"("speakerId");

-- CreateIndex
CREATE INDEX "knowledge_asset_tracks_trackId_idx" ON "knowledge_asset_tracks"("trackId");

-- CreateIndex
CREATE INDEX "poster_templates_templateType_isActive_sortOrder_idx" ON "poster_templates"("templateType", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "poster_jobs_templateId_idx" ON "poster_jobs"("templateId");

-- CreateIndex
CREATE INDEX "poster_jobs_knowledgeAssetId_idx" ON "poster_jobs"("knowledgeAssetId");

-- CreateIndex
CREATE INDEX "poster_jobs_eventId_idx" ON "poster_jobs"("eventId");

-- CreateIndex
CREATE INDEX "poster_jobs_speakerId_idx" ON "poster_jobs"("speakerId");

-- CreateIndex
CREATE INDEX "poster_jobs_status_createdAt_idx" ON "poster_jobs"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "knowledge_asset_versions" ADD CONSTRAINT "knowledge_asset_versions_knowledgeAssetId_fkey" FOREIGN KEY ("knowledgeAssetId") REFERENCES "knowledge_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_asset_events" ADD CONSTRAINT "knowledge_asset_events_knowledgeAssetId_fkey" FOREIGN KEY ("knowledgeAssetId") REFERENCES "knowledge_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_asset_events" ADD CONSTRAINT "knowledge_asset_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_asset_institutions" ADD CONSTRAINT "knowledge_asset_institutions_knowledgeAssetId_fkey" FOREIGN KEY ("knowledgeAssetId") REFERENCES "knowledge_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_asset_institutions" ADD CONSTRAINT "knowledge_asset_institutions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_asset_speakers" ADD CONSTRAINT "knowledge_asset_speakers_knowledgeAssetId_fkey" FOREIGN KEY ("knowledgeAssetId") REFERENCES "knowledge_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_asset_speakers" ADD CONSTRAINT "knowledge_asset_speakers_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "speakers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_asset_tracks" ADD CONSTRAINT "knowledge_asset_tracks_knowledgeAssetId_fkey" FOREIGN KEY ("knowledgeAssetId") REFERENCES "knowledge_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_asset_tracks" ADD CONSTRAINT "knowledge_asset_tracks_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_jobs" ADD CONSTRAINT "poster_jobs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "poster_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_jobs" ADD CONSTRAINT "poster_jobs_knowledgeAssetId_fkey" FOREIGN KEY ("knowledgeAssetId") REFERENCES "knowledge_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_jobs" ADD CONSTRAINT "poster_jobs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_jobs" ADD CONSTRAINT "poster_jobs_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "speakers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
