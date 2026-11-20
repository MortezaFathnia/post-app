-- Replace the previous (serial, administrativeNumber) unique key.
-- Existing records are preserved. This migration will fail if duplicate
-- (checkNumber, administrativeNumber) pairs already exist.
DROP INDEX IF EXISTS "DebtDiscountingRecord_serial_administrativeNumber_key";
DROP INDEX IF EXISTS "DebtDiscountingRecord_administrativeNumber_checkNumber_key";

CREATE UNIQUE INDEX "DebtDiscountingRecord_checkNumber_administrativeNumber_key"
ON "DebtDiscountingRecord"("checkNumber", "administrativeNumber");
