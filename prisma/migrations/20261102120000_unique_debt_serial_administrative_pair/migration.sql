-- Restore uniqueness to the pair (serial, administrativeNumber).
-- Neither field is unique on its own. Existing records are not modified.
DROP INDEX IF EXISTS "DebtDiscountingRecord_serial_key";
DROP INDEX IF EXISTS "DebtDiscountingRecord_administrativeNumber_key";
DROP INDEX IF EXISTS "DebtDiscountingRecord_administrativeNumber_checkNumber_key";

CREATE UNIQUE INDEX "DebtDiscountingRecord_serial_administrativeNumber_key"
ON "DebtDiscountingRecord"("serial", "administrativeNumber");
