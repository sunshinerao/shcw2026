-- CreateEnum
CREATE TYPE "KnowledgeDocumentFormat" AS ENUM ('PDF', 'DOCX');

-- CreateEnum
CREATE TYPE "KnowledgeTemplateType" AS ENUM ('FORMAL_DOCUMENT', 'WEBPAGE_DISPLAY');

-- AlterTable
ALTER TABLE "knowledge_assets" ADD COLUMN     "chapters" JSONB,
ADD COLUMN     "chaptersEn" JSONB,
ADD COLUMN     "primaryTemplateId" TEXT,
ADD COLUMN     "recommendations" TEXT,
ADD COLUMN     "recommendationsEn" TEXT,
ADD COLUMN     "tags" TEXT,
ADD COLUMN     "tagsEn" TEXT,
ADD COLUMN     "webTemplateId" TEXT;

-- CreateTable
CREATE TABLE "knowledge_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "templateType" "KnowledgeTemplateType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "documentFormat" TEXT,
    "includeElements" JSONB,
    "componentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_generation_jobs" (
    "id" TEXT NOT NULL,
    "knowledgeAssetId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "outputUrl" TEXT,
    "outputFormat" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "knowledge_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_templates_code_key" ON "knowledge_templates"("code");

-- CreateIndex
CREATE INDEX "knowledge_templates_templateType_isActive_isDefault_idx" ON "knowledge_templates"("templateType", "isActive", "isDefault");

-- CreateIndex
CREATE INDEX "knowledge_generation_jobs_knowledgeAssetId_templateId_idx" ON "knowledge_generation_jobs"("knowledgeAssetId", "templateId");

-- CreateIndex
CREATE INDEX "knowledge_generation_jobs_status_createdAt_idx" ON "knowledge_generation_jobs"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "knowledge_generation_jobs" ADD CONSTRAINT "knowledge_generation_jobs_knowledgeAssetId_fkey" FOREIGN KEY ("knowledgeAssetId") REFERENCES "knowledge_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_generation_jobs" ADD CONSTRAINT "knowledge_generation_jobs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "knowledge_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
