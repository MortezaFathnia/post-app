-- DESTRUCTIVE: Rebuilds only the Customer table to match prisma/schema.prisma.
-- Existing Customer rows and ContractCustomer links are intentionally deleted.
-- Other tables and their records are left untouched.
BEGIN;

DELETE FROM "ContractCustomer";
DROP TABLE IF EXISTS "Customer" CASCADE;

CREATE TABLE "Customer" (
  "id" SERIAL NOT NULL,
  "name" TEXT,
  "lastName" TEXT,
  "fatherName" TEXT,
  "birthDate" TEXT,
  "birthCertificateNumber" TEXT,
  "birthPlace" TEXT,
  "birthCertificateSerial" TEXT,
  "nationalCode" TEXT NOT NULL,
  "postalCode" TEXT,
  "passportNumber" TEXT,
  "occupation" TEXT,
  "installmentAmount" TEXT,
  "residence" TEXT,
  "address" TEXT,
  "workAddress" TEXT,
  "landline" TEXT,
  "workPhone" TEXT,
  "mobile" TEXT,
  "accountNumber" TEXT,
  "accountOpeningDate" TEXT,
  "longTermDepositNumber" TEXT,
  "longTermDepositAmount" TEXT,
  "customerNumber" TEXT,
  "companyName" TEXT,
  "registrationNumber" TEXT,
  "registrationDate" TEXT,
  "registrationOffice" TEXT,
  "companyEconomicCode" TEXT,
  "companyNationalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Customer_nationalCode_key" UNIQUE ("nationalCode")
);

ALTER TABLE "ContractCustomer"
  ADD CONSTRAINT "ContractCustomer_nationalCode_fkey"
  FOREIGN KEY ("nationalCode") REFERENCES "Customer"("nationalCode")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
