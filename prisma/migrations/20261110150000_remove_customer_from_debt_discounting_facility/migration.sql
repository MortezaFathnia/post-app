ALTER TABLE "DebtDiscountingFacility"
  DROP CONSTRAINT IF EXISTS "DebtDiscountingFacility_customerId_fkey";

ALTER TABLE "DebtDiscountingFacility"
  DROP COLUMN IF EXISTS "customerId",
  DROP COLUMN IF EXISTS "customerName",
  ADD COLUMN IF NOT EXISTS "facilityTitle" TEXT;
