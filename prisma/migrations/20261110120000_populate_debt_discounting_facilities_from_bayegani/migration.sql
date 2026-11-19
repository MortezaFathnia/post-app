ALTER TABLE "DebtDiscountingFacility"
ADD COLUMN "facilityNumber" TEXT,
ADD COLUMN "counterLabel" TEXT,
ADD COLUMN "serial" TEXT,
ADD COLUMN "facilityTitle" TEXT;

INSERT INTO "DebtDiscountingFacility" (
    "contractId",
    "facilityNumber",
    "facilityTitle",
    "counterLabel",
    "serial",
    "startDate",
    "endDate"
)
SELECT
    b."id",
    b."facilityNumber",
    b."facilityTitle",
    b."counterLabel",
    b."serial",
    COALESCE(b."startDate", ''),
    COALESCE(b."endDate", '')
FROM "BayeganiRecord" b
WHERE b."facilityNumber" IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM "DebtDiscountingRecord" d
      WHERE d."facilityNumber" = b."facilityNumber"
  )
  AND NOT EXISTS (
      SELECT 1
      FROM "DebtDiscountingFacility" f
      WHERE f."contractId" = b."id"
  );
