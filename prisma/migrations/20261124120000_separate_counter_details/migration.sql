CREATE TABLE "CounterDetails" (
    "id" SERIAL NOT NULL,
    "counterName" TEXT,
    "counterCode" TEXT,
    "brokerName" TEXT,
    "brokerCustomerCode" TEXT,
    "bankRepresentative" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CounterDetails_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CounterDetails" (
    "counterName",
    "counterCode",
    "brokerName",
    "brokerCustomerCode",
    "bankRepresentative",
    "createdAt",
    "updatedAt"
)
SELECT
    "counterName",
    "counterCode",
    "brokerName",
    "brokerCustomerCode",
    "bankRepresentative",
    "createdAt",
    "updatedAt"
FROM "BankDetails"
WHERE "counterName" IS NOT NULL
   OR "counterCode" IS NOT NULL
   OR "brokerName" IS NOT NULL
   OR "brokerCustomerCode" IS NOT NULL
   OR "bankRepresentative" IS NOT NULL;

ALTER TABLE "BankDetails"
    DROP COLUMN "counterName",
    DROP COLUMN "counterCode",
    DROP COLUMN "brokerName",
    DROP COLUMN "brokerCustomerCode",
    DROP COLUMN "bankRepresentative";
