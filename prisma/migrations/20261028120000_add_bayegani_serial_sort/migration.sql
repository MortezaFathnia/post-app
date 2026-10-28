ALTER TABLE "BayeganiRecord" ADD COLUMN "serialSort" BIGINT;

-- Backfill a numeric sort key for existing serials, including Persian and Arabic digits.
-- Keep non-numeric or unusually long serial values NULL so they sort last safely.
UPDATE "BayeganiRecord"
SET "serialSort" = (
  regexp_replace(
    translate("serial", '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'),
    '[[:space:],٬\u200e\u200f\u202a-\u202e\u2066-\u2069]',
    '',
    'g'
  )
)::BIGINT
WHERE "serial" IS NOT NULL
  AND length(regexp_replace(
    translate("serial", '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'),
    '[[:space:],٬\u200e\u200f\u202a-\u202e\u2066-\u2069]',
    '',
    'g'
  )) BETWEEN 1 AND 18
  AND regexp_replace(
    translate("serial", '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'),
    '[[:space:],٬\u200e\u200f\u202a-\u202e\u2066-\u2069]',
    '',
    'g'
  ) ~ '^[0-9]+$';

CREATE INDEX "BayeganiRecord_serialSort_idx" ON "BayeganiRecord"("serialSort");
