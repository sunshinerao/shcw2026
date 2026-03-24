ALTER TABLE "tracks"
ADD COLUMN "code" TEXT,
ADD COLUMN "descriptionEn" TEXT,
ADD COLUMN "partners" JSONB,
ADD COLUMN "partnersEn" JSONB;

WITH ordered_tracks AS (
  SELECT "id", LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt", "name")::text, 2, '0') AS next_code
  FROM "tracks"
)
UPDATE "tracks" AS target
SET "code" = ordered_tracks.next_code
FROM ordered_tracks
WHERE target."id" = ordered_tracks."id" AND target."code" IS NULL;

ALTER TABLE "tracks"
ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "tracks_code_key" ON "tracks"("code");

UPDATE "tracks"
SET "category" = 'accelerator'
WHERE "category" = 'comprehensive';

ALTER TABLE "events"
ADD COLUMN "descriptionEn" TEXT,
ADD COLUMN "shortDescEn" TEXT,
ADD COLUMN "venueEn" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "cityEn" TEXT,
ADD COLUMN "partners" JSONB,
ADD COLUMN "partnersEn" JSONB;

UPDATE "events"
SET "city" = COALESCE("city", 'Shanghai'),
    "cityEn" = COALESCE("cityEn", 'Shanghai');