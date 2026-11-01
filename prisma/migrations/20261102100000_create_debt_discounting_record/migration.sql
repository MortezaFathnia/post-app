CREATE TABLE "DebtDiscountingRecord" (
  "id" SERIAL NOT NULL,
  "sourceFile" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "sourceRow" INTEGER NOT NULL,
  "counterLabel" TEXT NOT NULL,
  "facilityNumber" TEXT NOT NULL,
  "serial" TEXT,
  "checkNumber" TEXT,
  "checkStatus" TEXT,
  "dueDate" TEXT,
  "paidAmount" TEXT,
  "unpaidAmount" TEXT,
  "embeddedProfit" TEXT,
  "delayDays" TEXT,
  "delayPenalty" TEXT,
  "bankAgent" TEXT,
  "administrativeNumber" TEXT,
  "rawData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DebtDiscountingRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DebtDiscountingRecord_facilityNumber_idx" ON "DebtDiscountingRecord"("facilityNumber");
CREATE INDEX "DebtDiscountingRecord_counterLabel_idx" ON "DebtDiscountingRecord"("counterLabel");
CREATE INDEX "DebtDiscountingRecord_sourceFile_sheetName_idx" ON "DebtDiscountingRecord"("sourceFile", "sheetName");
