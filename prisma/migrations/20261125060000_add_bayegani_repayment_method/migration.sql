ALTER TABLE "BayeganiRecord" ADD COLUMN "repaymentMethod" TEXT;

UPDATE "BayeganiRecord"
SET "repaymentMethod" = COALESCE(
  NULLIF("rawData"->>'نحوه بازپرداخت', ''),
  NULLIF("rawData"->>'سررسیدی یا اقساط', '')
)
WHERE "rawData" IS NOT NULL;
