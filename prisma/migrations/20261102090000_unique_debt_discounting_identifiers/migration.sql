-- Uniqueness applies to the combination of administrative and check numbers.
-- Remove the earlier individual unique indexes if a failed attempt created either one.
DROP INDEX IF EXISTS "DebtDiscountingRecord_checkNumber_key";
DROP INDEX IF EXISTS "DebtDiscountingRecord_administrativeNumber_key";

CREATE UNIQUE INDEX "DebtDiscountingRecord_administrativeNumber_checkNumber_key"
ON "DebtDiscountingRecord"("administrativeNumber", "checkNumber");
