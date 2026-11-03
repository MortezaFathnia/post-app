-- Add the domestic/foreign check field and make check status non-null.
ALTER TABLE "DebtDiscountingRecord"
ADD COLUMN "domesticForeign" TEXT;

UPDATE "DebtDiscountingRecord"
SET "checkStatus" = 'درراه'
WHERE "checkStatus" IS NULL OR BTRIM("checkStatus") = '';

ALTER TABLE "DebtDiscountingRecord"
ALTER COLUMN "checkStatus" SET DEFAULT 'درراه',
ALTER COLUMN "checkStatus" SET NOT NULL;
