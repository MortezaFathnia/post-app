-- Add facility display fields. The former Customer-based population logic
-- was removed because Customer is no longer part of the application schema.
ALTER TABLE "DebtDiscountingFacility"
ADD COLUMN "facilityNumber" TEXT,
ADD COLUMN "counterLabel" TEXT,
ADD COLUMN "serial" TEXT;
