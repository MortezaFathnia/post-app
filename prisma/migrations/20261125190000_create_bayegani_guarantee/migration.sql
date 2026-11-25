CREATE TABLE "BayeganiGuarantee" (
    "id" SERIAL NOT NULL,
    "rowNumber" TEXT,
    "economicSectorCode" TEXT,
    "facilityNumber" TEXT,
    "iban" TEXT,
    "facilityTitle" TEXT,
    "currentStatus" TEXT,
    "startDate" TEXT,
    "paymentCount" TEXT,
    "duration" TEXT,
    "approvedAmount" TEXT,
    "remainingAmount" TEXT,
    "subFacilityType" TEXT,
    "customerNumber" TEXT,
    "fileSerial" TEXT,
    "endDate" TEXT,
    "mainFacilityType" TEXT,
    "branchCode" TEXT,
    "additionalDescription" TEXT,
    "lastModifiedDate" TEXT,
    "archiveNumber" TEXT,
    "notificationLetterDate" TEXT,
    "notificationLetterNumber" TEXT,
    "requirements" TEXT,
    "approvalAuthority" TEXT,
    "nationalCode" TEXT,
    "requestDate" TEXT,
    "sourceFile" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BayeganiGuarantee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BayeganiGuarantee_facilityNumber_key"
    ON "BayeganiGuarantee"("facilityNumber");

CREATE INDEX "BayeganiGuarantee_customerNumber_idx"
    ON "BayeganiGuarantee"("customerNumber");

CREATE INDEX "BayeganiGuarantee_nationalCode_idx"
    ON "BayeganiGuarantee"("nationalCode");

CREATE INDEX "BayeganiGuarantee_currentStatus_idx"
    ON "BayeganiGuarantee"("currentStatus");

CREATE INDEX "BayeganiGuarantee_branchCode_idx"
    ON "BayeganiGuarantee"("branchCode");

ALTER TABLE "BayeganiGuarantee"
ADD CONSTRAINT "BayeganiGuarantee_facilityNumber_fkey"
FOREIGN KEY ("facilityNumber") REFERENCES "ContractDetails"("facilityNumber")
ON DELETE SET NULL ON UPDATE CASCADE;
