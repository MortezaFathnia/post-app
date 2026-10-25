ALTER TABLE "BayeganiRecord"
ADD COLUMN "counterLabel" TEXT;

UPDATE "BayeganiRecord"
SET "counterLabel" = CASE
  WHEN COALESCE(NULLIF(BTRIM("counterCode"), ''), '') <> ''
   AND COALESCE(NULLIF(BTRIM("counterName"), ''), '') <> ''
  THEN BTRIM("counterCode") || '-' || BTRIM("counterName")
  ELSE NULL
END;
