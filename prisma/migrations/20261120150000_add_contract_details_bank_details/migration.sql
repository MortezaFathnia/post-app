-- Create normalized contract and bank detail tables without dropping legacy Customer columns.
CREATE TABLE "ContractDetails" (
  "id" SERIAL NOT NULL,
  "customerId" INTEGER,
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

ALTER TABLE "BayeganiRecord" ADD COLUMN "contractCode" TEXT;

CREATE UNIQUE INDEX "ContractDetails_contractCode_key" ON "ContractDetails"("contractCode");
CREATE INDEX "ContractDetails_customerId_idx" ON "ContractDetails"("customerId");
CREATE UNIQUE INDEX "BankDetails_contractDetailsId_key" ON "BankDetails"("contractDetailsId");

ALTER TABLE "ContractDetails"
  ADD CONSTRAINT "ContractDetails_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankDetails"
  ADD CONSTRAINT "BankDetails_contractDetailsId_fkey"
  FOREIGN KEY ("contractDetailsId") REFERENCES "ContractDetails"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BayeganiRecord"
  ADD CONSTRAINT "BayeganiRecord_contractCode_fkey"
  FOREIGN KEY ("contractCode") REFERENCES "ContractDetails"("contractCode")
  ON DELETE SET NULL ON UPDATE CASCADE;
