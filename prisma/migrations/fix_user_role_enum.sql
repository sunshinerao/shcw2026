-- 添加 VERIFIER 到 UserRole 枚举
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VERIFIER';

-- 为现有用户生成气候护照ID（如果还没有）
UPDATE "users" 
SET "climatePassportId" = 'SCW2026-' || substr(md5(random()::text), 1, 6)
WHERE "climatePassportId" IS NULL;
