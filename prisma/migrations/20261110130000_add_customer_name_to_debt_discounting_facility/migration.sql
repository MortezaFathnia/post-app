ALTER TABLE "DebtDiscountingFacility"
ADD COLUMN "customerName" TEXT;

UPDATE "DebtDiscountingFacility" AS facility
SET "customerName" = COALESCE(
    NULLIF(customer."name", ''),
    NULLIF(customer."companyName", '')
)
FROM "Customer" AS customer
WHERE facility."customerId" = customer."id";
