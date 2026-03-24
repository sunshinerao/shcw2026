-- Add VERIFIER role to UserRole enum
-- Note: This is handled by Prisma automatically when the enum is updated

-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "climatePassportId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;

-- Add unique constraint on climatePassportId
CREATE UNIQUE INDEX IF NOT EXISTS "users_climatePassportId_key" ON "users"("climatePassportId");

-- Create wishlist table
CREATE TABLE IF NOT EXISTS "wishlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- Create unique index for wishlist
CREATE UNIQUE INDEX IF NOT EXISTS "wishlists_userId_eventId_key" ON "wishlists"("userId", "eventId");

-- Create indexes for wishlist
CREATE INDEX IF NOT EXISTS "wishlists_userId_idx" ON "wishlists"("userId");
CREATE INDEX IF NOT EXISTS "wishlists_eventId_idx" ON "wishlists"("eventId");

-- Add foreign keys for wishlist
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_eventId_fkey" 
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create point_transactions table
CREATE TABLE IF NOT EXISTS "point_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "eventId" TEXT,
    "registrationId" TEXT,
    "description" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for point_transactions
CREATE INDEX IF NOT EXISTS "point_transactions_userId_idx" ON "point_transactions"("userId");
CREATE INDEX IF NOT EXISTS "point_transactions_type_idx" ON "point_transactions"("type");
CREATE INDEX IF NOT EXISTS "point_transactions_createdAt_idx" ON "point_transactions"("createdAt");

-- Add foreign key for point_transactions
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new columns to registrations table
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "checkedInBy" TEXT;
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "checkInMethod" TEXT;
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "pointsEarned" INTEGER NOT NULL DEFAULT 0;

-- Add index for checkedInBy
CREATE INDEX IF NOT EXISTS "registrations_checkedInBy_idx" ON "registrations"("checkedInBy");
