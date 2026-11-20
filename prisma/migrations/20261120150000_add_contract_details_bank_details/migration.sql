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

-- Backfill the new normalized tables from legacy Customer columns.
-- Keep one ContractDetails row per non-null contractCode; null codes remain separate.
WITH ranked_customers AS (
  SELECT c.*,
         ROW_NUMBER() OVER (PARTITION BY c."contractCode" ORDER BY c."id") AS contract_rank
  FROM "Customer" c
)
INSERT INTO "ContractDetails" (
  "customerId", "contractCode", "contractNumber", "contractDate",
  "requestNumber", "requestDate", "approvalNumber", "approvalDate",
  "maturityDate", "facilityDescription", "economicSector", "useOfFunds",
  "transactionDescription", "salePrice", "salePriceWords", "purchasePrice",
  "profitAmount", "interestRate", "latePaymentBaseRate", "latePaymentRate",
  "prepayment", "payableAmount", "facilityAmount", "contractDuration",
  "repaymentMethod", "gracePeriod", "installmentCount", "installmentInterval",
  "firstInstallmentDate", "firstQardInstallmentDate", "bankParticipationPercent",
  "proposedPartnershipProfit", "proposedMudarabahProfit", "collateralType",
  "collateralDescription", "collateralValue", "updatedAt"
)
SELECT
  "id", "contractCode", "contractNumber", "contractDate",
  "requestNumber", "requestDate", "approvalNumber", "approvalDate",
  "maturityDate", "facilityDescription", "economicSector", "useOfFunds",
  "transactionDescription", "salePrice", "salePriceWords", "purchasePrice",
  "profitAmount", "interestRate", "latePaymentBaseRate", "latePaymentRate",
  "prepayment", "payableAmount", "facilityAmount", "contractDuration",
  "repaymentMethod", "gracePeriod", "installmentCount", "installmentInterval",
  "firstInstallmentDate", "firstQardInstallmentDate", "bankParticipationPercent",
  "proposedPartnershipProfit", "proposedMudarabahProfit", "collateralType",
  "collateralDescription", "collateralValue", CURRENT_TIMESTAMP
FROM ranked_customers
WHERE "contractCode" IS NULL OR contract_rank = 1;

INSERT INTO "BankDetails" (
  "contractDetailsId", "bankName", "branchName", "branchCode",
  "branchPostalCode", "branchPhone", "branchAddress", "branchManager",
  "counterName", "counterCode", "brokerName", "brokerCustomerCode",
  "bankRepresentative", "updatedAt"
)
SELECT
  cd."id", c."bankName", c."branchName", c."branchCode",
  c."branchPostalCode", c."branchPhone", c."branchAddress", c."branchManager",
  c."counterName", c."counterCode", c."brokerName", c."brokerCustomerCode",
  c."bankRepresentative", CURRENT_TIMESTAMP
FROM "ContractDetails" cd
JOIN "Customer" c ON c."id" = cd."customerId";

-- Link existing archive rows only when a customer has exactly one contract.
WITH unique_customer_contracts AS (
  SELECT "customerId", MIN("contractCode") AS "contractCode"
  FROM "ContractDetails"
  WHERE "customerId" IS NOT NULL AND "contractCode" IS NOT NULL
  GROUP BY "customerId"
  HAVING COUNT(*) = 1
)
UPDATE "BayeganiRecord" br
SET "contractCode" = ucc."contractCode"
FROM "Customer" c
JOIN unique_customer_contracts ucc ON ucc."customerId" = c."id"
WHERE br."nationalId" = c."nationalCode";

CREATE INDEX "BayeganiRecord_contractCode_idx" ON "BayeganiRecord"("contractCode");
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
