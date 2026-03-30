-- AlterTable
ALTER TABLE "sponsors" ADD COLUMN IF NOT EXISTS "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;
