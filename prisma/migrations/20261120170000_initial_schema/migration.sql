-- Fresh initial schema for the current Prisma datamodel.
-- This migration replaces the inconsistent historical migration chain.

CREATE TYPE "CustomerRole" AS ENUM ('CUSTOMER', 'BORROWER', 'GUARANTOR_1', 'GUARANTOR_2', 'GUARANTOR_3');

CREATE TABLE "ContractDetails" (
    "id" SERIAL NOT NULL,
    "contractCode" TEXT,
    "contractNumber" TEXT,
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

CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "contractCode" TEXT NOT NULL,
    "role" "CustomerRole" NOT NULL,
    "name" TEXT,
    "lastName" TEXT,
    "fatherName" TEXT,
    "birthDate" TEXT,
    "birthCertificateNumber" TEXT,
    "birthPlace" TEXT,
    "birthCertificateSerial" TEXT,
    "nationalCode" TEXT,
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
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
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
    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BayeganiRecord" (
    "id" SERIAL NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "facilityNumber" TEXT,
    "customerNumber" TEXT,
    "archiveCode" TEXT,
    "facilityTitle" TEXT,
    "serial" TEXT,
    "serialSort" BIGINT,
    "classification" TEXT,
    "counterName" TEXT,
    "counterCode" TEXT,
    "counterLabel" TEXT,
    "status" TEXT DEFAULT 'فعال',
    "startDate" TEXT,
    "endDate" TEXT,
    "duration" TEXT,
    "installmentCount" TEXT,
    "approvedAmount" TEXT,
    "remainingAmount" TEXT,
    "nationalId" TEXT,
    "contractCode" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BayeganiRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DebtDiscountingFacility" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "facilityNumber" TEXT,
    "facilityTitle" TEXT,
    "counterLabel" TEXT,
    "serial" TEXT,
    "status" TEXT NOT NULL DEFAULT 'فعال',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DebtDiscountingFacility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacilityCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FacilityCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContractDetails_contractCode_key" ON "ContractDetails"("contractCode");
CREATE INDEX "Customer_nationalCode_idx" ON "Customer"("nationalCode");
CREATE UNIQUE INDEX "Customer_contractCode_role_key" ON "Customer"("contractCode", "role");
CREATE UNIQUE INDEX "BankDetails_contractDetailsId_key" ON "BankDetails"("contractDetailsId");
CREATE INDEX "BayeganiRecord_facilityNumber_idx" ON "BayeganiRecord"("facilityNumber");
CREATE INDEX "BayeganiRecord_customerNumber_idx" ON "BayeganiRecord"("customerNumber");
CREATE INDEX "BayeganiRecord_nationalId_idx" ON "BayeganiRecord"("nationalId");
CREATE INDEX "BayeganiRecord_archiveCode_idx" ON "BayeganiRecord"("archiveCode");
CREATE INDEX "BayeganiRecord_serialSort_idx" ON "BayeganiRecord"("serialSort");
CREATE INDEX "BayeganiRecord_contractCode_idx" ON "BayeganiRecord"("contractCode");
CREATE UNIQUE INDEX "BayeganiRecord_sourceFile_sheetName_sourceRow_key" ON "BayeganiRecord"("sourceFile", "sheetName", "sourceRow");
CREATE UNIQUE INDEX "BayeganiRecord_facilityNumber_serial_key" ON "BayeganiRecord"("facilityNumber", "serial");
CREATE INDEX "DebtDiscountingFacility_contractId_idx" ON "DebtDiscountingFacility"("contractId");
CREATE INDEX "DebtDiscountingFacility_facilityNumber_idx" ON "DebtDiscountingFacility"("facilityNumber");
CREATE INDEX "DebtDiscountingFacility_status_idx" ON "DebtDiscountingFacility"("status");
CREATE UNIQUE INDEX "FacilityCode_code_key" ON "FacilityCode"("code");

ALTER TABLE "Customer"
    ADD CONSTRAINT "Customer_contractCode_fkey"
    FOREIGN KEY ("contractCode") REFERENCES "ContractDetails"("contractCode")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankDetails"
    ADD CONSTRAINT "BankDetails_contractDetailsId_fkey"
    FOREIGN KEY ("contractDetailsId") REFERENCES "ContractDetails"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BayeganiRecord"
    ADD CONSTRAINT "BayeganiRecord_contractCode_fkey"
    FOREIGN KEY ("contractCode") REFERENCES "ContractDetails"("contractCode")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DebtDiscountingFacility"
    ADD CONSTRAINT "DebtDiscountingFacility_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "BayeganiRecord"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;


-- Independent application data models retained alongside the new contract/customer model.
CREATE TABLE "Bank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bajehCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bajehCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DebtDiscountingRecord" (
    "id" SERIAL NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "counterLabel" TEXT NOT NULL,
    "facilityNumber" TEXT NOT NULL,
    "customerNumber" TEXT,
    "serial" TEXT,
    "checkNumber" TEXT,
    "checkStatus" TEXT NOT NULL DEFAULT 'درراه',
    "domesticForeign" TEXT,
    "dueDate" TEXT,
    "paidAmount" TEXT,
    "unpaidAmount" TEXT,
    "embeddedProfit" TEXT,
    "delayDays" TEXT,
    "delayPenalty" TEXT,
    "bankAgent" TEXT,
    "checkBranch" TEXT,
    "description" TEXT,
    "administrativeNumber" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DebtDiscountingRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DebtDocument" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER,
    "facilityNumber" TEXT,
    "facilityTitle" TEXT,
    "counterLabel" TEXT,
    "serial" TEXT,
    "status" TEXT NOT NULL DEFAULT 'فعال',
    "startDate" TEXT,
    "endDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DebtDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Bank_name_key" ON "Bank"("name");
CREATE UNIQUE INDEX "Bank_bankId_key" ON "Bank"("bankId");
CREATE UNIQUE INDEX "bajehCode_code_name_key" ON "bajehCode"("code", "name");
CREATE INDEX "bajehCode_code_idx" ON "bajehCode"("code");
CREATE INDEX "bajehCode_name_idx" ON "bajehCode"("name");
CREATE INDEX "DebtDiscountingRecord_facilityNumber_idx" ON "DebtDiscountingRecord"("facilityNumber");
CREATE INDEX "DebtDiscountingRecord_counterLabel_idx" ON "DebtDiscountingRecord"("counterLabel");
CREATE UNIQUE INDEX "DebtDiscountingRecord_checkNumber_administrativeNumber_key" ON "DebtDiscountingRecord"("checkNumber", "administrativeNumber");
CREATE INDEX "DebtDiscountingRecord_sourceFile_sheetName_idx" ON "DebtDiscountingRecord"("sourceFile", "sheetName");
CREATE UNIQUE INDEX "DebtDocument_contractId_key" ON "DebtDocument"("contractId");
CREATE INDEX "DebtDocument_facilityNumber_idx" ON "DebtDocument"("facilityNumber");
CREATE INDEX "DebtDocument_status_idx" ON "DebtDocument"("status");

ALTER TABLE "DebtDocument"
    ADD CONSTRAINT "DebtDocument_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "BayeganiRecord"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
