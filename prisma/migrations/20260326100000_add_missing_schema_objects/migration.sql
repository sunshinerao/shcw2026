-- Idempotent migration: adds all schema objects that were missing from earlier migrations.
-- Uses DO blocks with IF NOT EXISTS checks so it can run safely on both fresh and existing databases.

-- CreateEnum: EventLayer
DO $$ BEGIN
  CREATE TYPE "EventLayer" AS ENUM ('INSTITUTION', 'ECONOMY', 'ROOT', 'ACCELERATOR', 'COMPREHENSIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: EventHostType
DO $$ BEGIN
  CREATE TYPE "EventHostType" AS ENUM ('OFFICIAL', 'CO_HOSTED', 'REGISTERED', 'SIDE_EVENT', 'COMMUNITY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: ContactCategory
DO $$ BEGIN
  CREATE TYPE "ContactCategory" AS ENUM ('GENERAL', 'ORGANIZATION', 'PARTNERSHIP', 'SPEAKER', 'MEDIA', 'SPONSOR', 'VOLUNTEER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: ContactMessageStatus
DO $$ BEGIN
  CREATE TYPE "ContactMessageStatus" AS ENUM ('PENDING', 'REPLIED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: InvitationStatus
DO $$ BEGIN
  CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'UPLOADED', 'DOWNLOADED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: events — add eventLayer, hostType
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "eventLayer" "EventLayer";
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "hostType" "EventHostType";

-- AlterTable: news — add bilingual fields
ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "titleEn" TEXT;
ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "excerptEn" TEXT;
ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "contentEn" TEXT;

-- CreateTable: site_contents
CREATE TABLE IF NOT EXISTS "site_contents" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "titleEn" TEXT,
    "subtitle" TEXT,
    "subtitleEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "extra" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "site_contents_key_key" ON "site_contents"("key");

-- CreateTable: invitation_requests
CREATE TABLE IF NOT EXISTS "invitation_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestTitle" TEXT,
    "guestOrg" TEXT,
    "guestEmail" TEXT,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "eventId" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "letterFileUrl" TEXT,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invitation_requests_userId_idx" ON "invitation_requests"("userId");
CREATE INDEX IF NOT EXISTS "invitation_requests_status_idx" ON "invitation_requests"("status");
CREATE INDEX IF NOT EXISTS "invitation_requests_eventId_idx" ON "invitation_requests"("eventId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "invitation_requests" ADD CONSTRAINT "invitation_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "invitation_requests" ADD CONSTRAINT "invitation_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: contact_messages
CREATE TABLE IF NOT EXISTS "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "userId" TEXT,
    "category" "ContactCategory" NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'PENDING',
    "adminReply" TEXT,
    "adminNotes" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contact_messages_category_idx" ON "contact_messages"("category");
CREATE INDEX IF NOT EXISTS "contact_messages_status_idx" ON "contact_messages"("status");
CREATE INDEX IF NOT EXISTS "contact_messages_userId_idx" ON "contact_messages"("userId");
CREATE INDEX IF NOT EXISTS "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
