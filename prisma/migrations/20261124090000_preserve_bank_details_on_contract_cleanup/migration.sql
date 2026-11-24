-- Keep BankDetails rows when their mock ContractDetails rows are removed.
ALTER TABLE "BankDetails"
  DROP CONSTRAINT "BankDetails_contractDetailsId_fkey";

ALTER TABLE "BankDetails"
  ALTER COLUMN "contractDetailsId" DROP NOT NULL;

ALTER TABLE "BankDetails"
  ADD CONSTRAINT "BankDetails_contractDetailsId_fkey"
  FOREIGN KEY ("contractDetailsId")
  REFERENCES "ContractDetails"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
