ALTER TABLE "BayeganiRecord" ADD COLUMN "serialSort" BIGINT;

-- Backfill a numeric sort key for existing serials, including Persian and Arabic digits.
-- Non-numeric or unusually long serial values remain NULL and sort last.
WITH normalized AS (
  SELECT
    "id",
    regexp_replace(
      translate("serial", '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'),
      '[^0-9]',
      '',
      'g'
    ) AS digits
  FROM "BayeganiRecord"
  WHERE "serial" IS NOT NULL
)
UPDATE "BayeganiRecord" AS record
SET "serialSort" = normalized.digits::BIGINT
FROM normalized
WHERE record."id" = normalized."id"
  AND length(normalized.digits) BETWEEN 1 AND 18;

CREATE INDEX "BayeganiRecord_serialSort_idx" ON "BayeganiRecord"("serialSort");
