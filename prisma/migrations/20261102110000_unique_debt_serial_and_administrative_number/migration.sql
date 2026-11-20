-- Replace the composite uniqueness rule with two independent unique constraints.
-- Existing rows are preserved. This migration will fail safely if duplicate
-- serials or administrative numbers already exist in the table.
DROP INDEX IF EXISTS "DebtDiscountingRecord_administrativeNumber_checkNumber_key";

CREATE UNIQUE INDEX "DebtDiscountingRecord_serial_key"
ON "DebtDiscountingRecord"("serial");

CREATE UNIQUE INDEX "DebtDiscountingRecord_administrativeNumber_key"
ON "DebtDiscountingRecord"("administrativeNumber");
