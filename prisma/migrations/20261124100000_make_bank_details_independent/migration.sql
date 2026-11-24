-- BankDetails is shared reference data, not owned by any contract.
-- Keep all existing bank/branch rows and remove only the obsolete relation column.
ALTER TABLE "BankDetails"
  DROP COLUMN "contractDetailsId";
