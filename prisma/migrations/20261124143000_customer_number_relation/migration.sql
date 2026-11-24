-- Backfill the new relation key before removing the old nationalCode column.
ALTER TABLE "ContractCustomer" ADD COLUMN "customerNumber" TEXT;

UPDATE "ContractCustomer" cc
SET "customerNumber" = c."customerNumber"
FROM "Customer" c
WHERE c."nationalCode" = cc."nationalCode";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ContractCustomer" WHERE "customerNumber" IS NULL OR "customerNumber" = '') THEN
    RAISE EXCEPTION 'Cannot migrate ContractCustomer: referenced customers must have customerNumber values';
  END IF;
END $$;

-- Ensure customerNumber is a valid unique relation key.
CREATE UNIQUE INDEX "Customer_customerNumber_key" ON "Customer"("customerNumber");

ALTER TABLE "ContractCustomer" DROP CONSTRAINT "ContractCustomer_nationalCode_fkey";
ALTER TABLE "ContractCustomer" DROP CONSTRAINT "ContractCustomer_pkey";
ALTER TABLE "ContractCustomer" DROP COLUMN "nationalCode";
ALTER TABLE "ContractCustomer" ALTER COLUMN "customerNumber" SET NOT NULL;
ALTER TABLE "ContractCustomer" ADD CONSTRAINT "ContractCustomer_customerNumber_fkey"
  FOREIGN KEY ("customerNumber") REFERENCES "Customer"("customerNumber")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractCustomer" ADD CONSTRAINT "ContractCustomer_pkey"
  PRIMARY KEY ("facilityNumber", "customerNumber");
CREATE INDEX "ContractCustomer_customerNumber_idx" ON "ContractCustomer"("customerNumber");
