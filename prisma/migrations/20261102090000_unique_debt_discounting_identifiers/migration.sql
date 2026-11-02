-- Enforce global uniqueness for non-null check and administrative numbers.
-- PostgreSQL allows multiple NULL values in a unique index.
CREATE UNIQUE INDEX "DebtDiscountingRecord_checkNumber_key"
ON "DebtDiscountingRecord"("checkNumber");

CREATE UNIQUE INDEX "DebtDiscountingRecord_administrativeNumber_key"
ON "DebtDiscountingRecord"("administrativeNumber");
