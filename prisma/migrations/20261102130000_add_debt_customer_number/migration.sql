-- Store customer number separately for debt-discounting records.
ALTER TABLE "DebtDiscountingRecord"
ADD COLUMN "customerNumber" TEXT;

-- Derive customer number from the third dot-separated segment of facilityNumber.
UPDATE "DebtDiscountingRecord"
SET "customerNumber" = NULLIF(BTRIM(split_part("facilityNumber", '.', 3)), '')
WHERE "facilityNumber" IS NOT NULL;
