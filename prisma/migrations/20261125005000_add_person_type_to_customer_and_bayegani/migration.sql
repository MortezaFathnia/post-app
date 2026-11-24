-- Add a normalized person classification to customers and archive records.
ALTER TABLE "Customer"
ADD COLUMN "personType" TEXT NOT NULL DEFAULT 'حقیقی';

ALTER TABLE "BayeganiRecord"
ADD COLUMN "personType" TEXT NOT NULL DEFAULT 'حقیقی';

-- Backfill legal entities from their existing company fields.
UPDATE "Customer"
SET "personType" = 'حقوقی'
WHERE "companyName" IS NOT NULL OR "registrationNumber" IS NOT NULL;

-- Backfill archive records using the person type already stored in rawData.
UPDATE "BayeganiRecord"
SET "personType" = CASE
  WHEN "rawData"->>'نوع شخص' IN ('حقیقی', 'حقوقی') THEN "rawData"->>'نوع شخص'
  ELSE 'حقیقی'
END;

-- Legal entities do not have a national code. Allow NULL while retaining
-- uniqueness for natural-person national codes (PostgreSQL permits multiple NULLs).
ALTER TABLE "Customer"
ALTER COLUMN "nationalCode" DROP NOT NULL;
