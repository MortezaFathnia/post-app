ALTER TABLE "DebtDiscountingRecord"
ADD COLUMN "description" TEXT;

-- Backfill descriptions already present in the original Excel JSON data.
UPDATE "DebtDiscountingRecord"
SET "description" = "rawData" ->> 'توضیحات'
WHERE "description" IS NULL
  AND "rawData" ? 'توضیحات';
