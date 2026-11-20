-- Restore standalone feature tables without changing the already-applied initial schema.
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
ALTER TABLE "DebtDocument" ADD CONSTRAINT "DebtDocument_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "BayeganiRecord"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
