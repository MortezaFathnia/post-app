-- Incremental migration for the existing database.
-- Existing feature tables and records are preserved.

DO $$
BEGIN
  CREATE TYPE "CustomerRole" AS ENUM (
    'CUSTOMER', 'BORROWER', 'GUARANTOR_1', 'GUARANTOR_2', 'GUARANTOR_3'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ContractType" AS ENUM ('MORABAHA', 'CREDIT_CARD', 'DEBT_DISCOUNTING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LoanType" AS ENUM ('MATURITY', 'INSTALLMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- On databases where the legacy Customer table was dropped by an earlier
-- migration, create the new role-based table. On the current database this
-- statement is a no-op because Customer exists and is empty.
CREATE TABLE IF NOT EXISTS "Customer" (
  "contractCode" TEXT NOT NULL,
  "role" "CustomerRole" NOT NULL,
  "name" TEXT,
  "lastName" TEXT,
  "fatherName" TEXT,
  "birthDate" TEXT,
  "birthCertificateNumber" TEXT,
  "birthPlace" TEXT,
  "birthCertificateSerial" TEXT,
  "nationalCode" TEXT NOT NULL,
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("nationalCode")
);

DO $$
DECLARE
  referencing_constraints TEXT;
BEGIN
  SELECT string_agg(c.conname, ', ')
    INTO referencing_constraints
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.confrelid
   AND a.attnum = ANY(c.confkey)
  WHERE c.contype = 'f'
    AND c.confrelid = '"Customer"'::regclass
    AND a.attname = 'id';

  IF referencing_constraints IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot replace Customer primary key while foreign keys reference Customer.id: %',
      referencing_constraints;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Customer"
    WHERE "nationalCode" IS NULL OR BTRIM("nationalCode") = ''
       OR "contractCode" IS NULL OR BTRIM("contractCode") = ''
  ) THEN
    RAISE EXCEPTION
      'Customer contains rows without nationalCode or contractCode; resolve them before changing the primary key.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ContractDetails" (
  "id" SERIAL NOT NULL,
  "contractCode" TEXT,
  "contractNumber" TEXT,
  "contractType" "ContractType" NOT NULL DEFAULT 'MORABAHA',
  "loanType" "LoanType",
  "contractDate" TEXT,
  "requestNumber" TEXT,
  "requestDate" TEXT,
  "approvalNumber" TEXT,
  "approvalDate" TEXT,
  "maturityDate" TEXT,
  "facilityDescription" TEXT,
  "economicSector" TEXT,
  "useOfFunds" TEXT,
  "transactionDescription" TEXT,
  "salePrice" TEXT,
  "salePriceWords" TEXT,
  "purchasePrice" TEXT,
  "profitAmount" TEXT,
  "interestRate" TEXT,
  "latePaymentBaseRate" TEXT,
  "latePaymentRate" TEXT,
  "prepayment" TEXT,
  "payableAmount" TEXT,
  "facilityAmount" TEXT,
  "contractDuration" TEXT,
  "repaymentMethod" TEXT,
  "gracePeriod" TEXT,
  "installmentCount" TEXT,
  "installmentInterval" TEXT,
  "firstInstallmentDate" TEXT,
  "firstQardInstallmentDate" TEXT,
  "bankParticipationPercent" TEXT,
  "proposedPartnershipProfit" TEXT,
  "proposedMudarabahProfit" TEXT,
  "collateralType" TEXT,
  "collateralDescription" TEXT,
  "collateralValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractDetails_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BankDetails" (
  "id" SERIAL NOT NULL,
  "contractDetailsId" INTEGER NOT NULL,
  "bankName" TEXT,
  "branchName" TEXT,
  "branchCode" TEXT,
  "branchPostalCode" TEXT,
  "branchPhone" TEXT,
  "branchAddress" TEXT,
  "branchManager" TEXT,
  "counterName" TEXT,
  "counterCode" TEXT,
  "brokerName" TEXT,
  "brokerCustomerCode" TEXT,
  "bankRepresentative" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- Preserve the legacy id column if it exists, but use nationalCode as the PK.
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "residence" TEXT,
  ADD COLUMN IF NOT EXISTS "accountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "accountOpeningDate" TEXT,
  ADD COLUMN IF NOT EXISTS "longTermDepositNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "longTermDepositAmount" TEXT,
  ADD COLUMN IF NOT EXISTS "customerNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "role" "CustomerRole",
  ADD COLUMN IF NOT EXISTS "contractCode" TEXT;

-- The existing Customer table may still carry required legacy columns that
-- are intentionally no longer part of the role-based Prisma Customer model.
-- Keep the columns for compatibility, but remove their obsolete NOT NULL
-- checks so new Customer records do not need legacy id/type/contractType values.
ALTER TABLE "Customer"
  DROP CONSTRAINT IF EXISTS "Customer_id_not_null",
  DROP CONSTRAINT IF EXISTS "Customer_type_not_null",
  DROP CONSTRAINT IF EXISTS "Customer_contractType_not_null";

DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Customer' AND column_name = 'id'
  ) THEN
    ALTER TABLE "Customer" ALTER COLUMN "id" DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Customer' AND column_name = 'type'
  ) THEN
    ALTER TABLE "Customer" ALTER COLUMN "type" DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Customer' AND column_name = 'contractType'
  ) THEN
    ALTER TABLE "Customer" ALTER COLUMN "contractType" DROP NOT NULL;
  END IF;
END $;

ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_pkey";
ALTER TABLE "Customer"
  ALTER COLUMN "nationalCode" SET NOT NULL,
  ALTER COLUMN "contractCode" SET NOT NULL,
  ALTER COLUMN "role" SET NOT NULL,
  ADD CONSTRAINT "Customer_pkey" PRIMARY KEY ("nationalCode");

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_contractCode_role_key"
  ON "Customer"("contractCode", "role");
CREATE UNIQUE INDEX IF NOT EXISTS "ContractDetails_contractCode_key"
  ON "ContractDetails"("contractCode");
CREATE UNIQUE INDEX IF NOT EXISTS "BankDetails_contractDetailsId_key"
  ON "BankDetails"("contractDetailsId");

ALTER TABLE "BayeganiRecord"
  ADD COLUMN IF NOT EXISTS "contractCode" TEXT;
CREATE INDEX IF NOT EXISTS "BayeganiRecord_contractCode_idx"
  ON "BayeganiRecord"("contractCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Customer_contractCode_fkey'
      AND conrelid = '"Customer"'::regclass
  ) THEN
    ALTER TABLE "Customer"
      ADD CONSTRAINT "Customer_contractCode_fkey"
      FOREIGN KEY ("contractCode") REFERENCES "ContractDetails"("contractCode")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BankDetails_contractDetailsId_fkey'
      AND conrelid = '"BankDetails"'::regclass
  ) THEN
    ALTER TABLE "BankDetails"
      ADD CONSTRAINT "BankDetails_contractDetailsId_fkey"
      FOREIGN KEY ("contractDetailsId") REFERENCES "ContractDetails"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BayeganiRecord_contractCode_fkey'
      AND conrelid = '"BayeganiRecord"'::regclass
  ) THEN
    ALTER TABLE "BayeganiRecord"
      ADD CONSTRAINT "BayeganiRecord_contractCode_fkey"
      FOREIGN KEY ("contractCode") REFERENCES "ContractDetails"("contractCode")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
