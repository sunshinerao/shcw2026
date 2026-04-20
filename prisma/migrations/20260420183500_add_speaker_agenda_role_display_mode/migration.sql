-- Add missing speaker agenda role display mode for deployments that predate the feature
ALTER TABLE "speakers"
ADD COLUMN IF NOT EXISTS "agendaRoleDisplayMode" TEXT NOT NULL DEFAULT 'allCurrent';
