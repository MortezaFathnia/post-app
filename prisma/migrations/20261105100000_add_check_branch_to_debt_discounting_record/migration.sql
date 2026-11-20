ALTER TABLE "DebtDiscountingRecord"
ADD COLUMN "checkBranch" TEXT;

-- Preserve branch values already stored in the original Excel JSON data.
UPDATE "DebtDiscountingRecord"
SET "checkBranch" = COALESCE(
  "rawData" ->> 'شعبه چک',
  "rawData" ->> 'شعبه'
)
WHERE "checkBranch" IS NULL;
