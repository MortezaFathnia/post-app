-- Rename the contract identifier to facilityNumber and attach archive rows to it.
-- Add the optional FacilityCode relation without deleting existing archive data.
BEGIN;

ALTER TABLE "ContractCustomer" DROP CONSTRAINT IF EXISTS "ContractCustomer_contractCode_fkey";
DROP INDEX IF EXISTS "ContractCustomer_contractCode_role_key";

ALTER TABLE "ContractDetails" RENAME COLUMN "contractCode" TO "facilityNumber";
ALTER TABLE "ContractCustomer" RENAME COLUMN "contractCode" TO "facilityNumber";

ALTER TABLE "ContractCustomer" RENAME CONSTRAINT "ContractCustomer_pkey" TO "ContractCustomer_pkey";
ALTER TABLE "ContractCustomer"
  ADD CONSTRAINT "ContractCustomer_facilityNumber_fkey"
  FOREIGN KEY ("facilityNumber") REFERENCES "ContractDetails"("facilityNumber")
  ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ContractCustomer_facilityNumber_role_key"
  ON "ContractCustomer"("facilityNumber", "role");

-- The old BayeganiRecord.contractCode relation is replaced by the existing
-- facilityNumber column, which now points to ContractDetails.facilityNumber.
ALTER TABLE "BayeganiRecord" DROP CONSTRAINT IF EXISTS "BayeganiRecord_contractCode_fkey";
DROP INDEX IF EXISTS "BayeganiRecord_contractCode_idx";
ALTER TABLE "BayeganiRecord" DROP COLUMN IF EXISTS "contractCode";
ALTER TABLE "BayeganiRecord"
  ADD CONSTRAINT "BayeganiRecord_facilityNumber_fkey"
  FOREIGN KEY ("facilityNumber") REFERENCES "ContractDetails"("facilityNumber")
  ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

ALTER TABLE "BayeganiRecord" ADD COLUMN "facilityCode" TEXT;
CREATE INDEX "BayeganiRecord_facilityCode_idx" ON "BayeganiRecord"("facilityCode");
ALTER TABLE "BayeganiRecord"
  ADD CONSTRAINT "BayeganiRecord_facilityCode_fkey"
  FOREIGN KEY ("facilityCode") REFERENCES "FacilityCode"("code")
  ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

COMMIT;
