-- DESTRUCTIVE: Recreates Customer, ContractDetails, ContractCustomer, and BankDetails.
-- Preserves all rows in BayeganiRecord, DebtDiscountingFacility, FacilityCode,
-- FacilityClassification, Bank, BajehCode, DebtDiscountingRecord, and DebtDocument.
-- Customer, ContractDetails, ContractCustomer, and BankDetails data will be deleted.
--
-- Run against the intended PostgreSQL database only after taking a backup.
-- Existing PostgreSQL enum types ContractType, LoanType, and CustomerRole are retained.

BEGIN;

-- Remove only the FK from BayeganiRecord to ContractDetails so that
-- ContractDetails can be recreated. BayeganiRecord rows are not modified.
ALTER TABLE "BayeganiRecord"
  DROP CONSTRAINT IF EXISTS "BayeganiRecord_facilityNumber_fkey";

-- Drop dependent tables first. No CASCADE: unexpected dependencies should
-- cause the transaction to fail rather than silently remove other objects.
DROP TABLE IF EXISTS "BankDetails";
DROP TABLE IF EXISTS "ContractCustomer";
DROP TABLE IF EXISTS "ContractDetails";
DROP TABLE IF EXISTS "Customer";

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

CREATE TABLE "ContractDetails" (
  "id" SERIAL NOT NULL,
  "facilityNumber" TEXT,
  "contractReference" TEXT,
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
  CONSTRAINT "ContractDetails_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContractDetails_facilityNumber_key" UNIQUE ("facilityNumber")
);

CREATE TABLE "ContractCustomer" (
  "facilityNumber" TEXT NOT NULL,
  "nationalCode" TEXT NOT NULL,
  "role" "CustomerRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractCustomer_pkey" PRIMARY KEY ("facilityNumber", "nationalCode"),
  CONSTRAINT "ContractCustomer_facilityNumber_role_key" UNIQUE ("facilityNumber", "role"),
  CONSTRAINT "ContractCustomer_facilityNumber_fkey"
    FOREIGN KEY ("facilityNumber") REFERENCES "ContractDetails"("facilityNumber")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContractCustomer_nationalCode_fkey"
    FOREIGN KEY ("nationalCode") REFERENCES "Customer"("nationalCode")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BankDetails" (
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
  CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankDetails_contractDetailsId_key" UNIQUE ("contractDetailsId"),
  CONSTRAINT "BankDetails_contractDetailsId_fkey"
    FOREIGN KEY ("contractDetailsId") REFERENCES "ContractDetails"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContractCustomer_nationalCode_idx"
  ON "ContractCustomer"("nationalCode");

-- Restore the relation from the preserved archive table to the new ContractDetails.
ALTER TABLE "BayeganiRecord"
  ADD CONSTRAINT "BayeganiRecord_facilityNumber_fkey"
  FOREIGN KEY ("facilityNumber") REFERENCES "ContractDetails"("facilityNumber")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
