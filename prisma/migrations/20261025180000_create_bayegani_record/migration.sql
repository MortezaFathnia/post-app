CREATE TABLE IF NOT EXISTS "BayeganiRecord" (
  "id" SERIAL NOT NULL,
  "sourceFile" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "sourceRow" INTEGER NOT NULL,
  "facilityNumber" TEXT,
  "customerNumber" TEXT,
  "archiveCode" TEXT,
  "facilityTitle" TEXT,
  "serial" TEXT NOT NULL,
  "classification" TEXT NOT NULL,
  "counterName" TEXT NOT NULL,
  "counterCode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "approvedAmount" TEXT NOT NULL,
  "remainingAmount" TEXT NOT NULL,
  "nationalId" TEXT NOT NULL,
  "rawData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BayeganiRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BayeganiRecord_sourceFile_sheetName_sourceRow_key"
ON "BayeganiRecord"("sourceFile", "sheetName", "sourceRow");

CREATE INDEX IF NOT EXISTS "BayeganiRecord_facilityNumber_idx"
ON "BayeganiRecord"("facilityNumber");

CREATE INDEX IF NOT EXISTS "BayeganiRecord_customerNumber_idx"
ON "BayeganiRecord"("customerNumber");

CREATE INDEX IF NOT EXISTS "BayeganiRecord_archiveCode_idx"
ON "BayeganiRecord"("archiveCode");
