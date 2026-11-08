ALTER TABLE "BayeganiRecord"
ADD COLUMN "installmentCount" TEXT;

-- Backfill the new column from the existing imported/manual JSON payloads.
UPDATE "BayeganiRecord"
SET "installmentCount" = COALESCE(
  NULLIF(BTRIM("rawData" ->> 'تعداد اقساط'), ''),
  NULLIF(BTRIM("rawData" ->> 'تعداد اقساط '), '')
)
WHERE "rawData" IS NOT NULL;
