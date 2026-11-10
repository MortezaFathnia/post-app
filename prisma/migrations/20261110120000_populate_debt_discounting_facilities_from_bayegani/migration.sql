ALTER TABLE "DebtDiscountingFacility"
ADD COLUMN "facilityNumber" TEXT,
ADD COLUMN "counterLabel" TEXT,
ADD COLUMN "serial" TEXT;

WITH unique_customers AS (
    SELECT
        "debtorCustomerNumber",
        MIN("id") AS "customerId"
    FROM "Customer"
    WHERE "debtorCustomerNumber" IS NOT NULL
    GROUP BY "debtorCustomerNumber"
    HAVING COUNT(*) = 1
),
matched_records AS (
    SELECT
        b."id" AS "contractId",
        uc."customerId",
        b."facilityNumber",
        b."counterLabel",
        b."serial",
        b."startDate",
        b."endDate"
    FROM "BayeganiRecord" b
    INNER JOIN "DebtDiscountingRecord" d
        ON d."facilityNumber" = b."facilityNumber"
    INNER JOIN unique_customers uc
        ON uc."debtorCustomerNumber" = b."customerNumber"
    WHERE b."facilityNumber" IS NOT NULL
    GROUP BY
        b."id",
        uc."customerId",
        b."facilityNumber",
        b."counterLabel",
        b."serial",
        b."startDate",
        b."endDate"
)
INSERT INTO "DebtDiscountingFacility" (
    "customerId",
    "contractId",
    "facilityNumber",
    "counterLabel",
    "serial",
    "startDate",
    "endDate"
)
SELECT
    m."customerId",
    m."contractId",
    m."facilityNumber",
    m."counterLabel",
    m."serial",
    COALESCE(m."startDate", ''),
    COALESCE(m."endDate", '')
FROM matched_records m
WHERE NOT EXISTS (
    SELECT 1
    FROM "DebtDiscountingFacility" f
    WHERE f."contractId" = m."contractId"
);
