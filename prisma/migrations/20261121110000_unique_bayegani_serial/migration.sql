-- Keep the first record for each serial (lowest id) unchanged.
-- Reassign duplicate serials to new values above the current archive-wide maximum.
WITH serial_max AS (
  SELECT GREATEST(
    COALESCE(MAX("serialSort"), 0),
    COALESCE(
      MAX(
        CASE
          WHEN "serial" ~ '^[0-9]+$' THEN "serial"::numeric
          ELSE NULL
        END
      )::bigint,
      0
    )
  ) AS max_serial
  FROM "BayeganiRecord"
),
ranked_duplicates AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "id") AS duplicate_offset
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (PARTITION BY "serial" ORDER BY "id") AS occurrence
    FROM "BayeganiRecord"
    WHERE "serial" IS NOT NULL
  ) ranked
  WHERE occurrence > 1
)
UPDATE "BayeganiRecord" AS record
SET
  "serial" = (serial_max.max_serial + ranked_duplicates.duplicate_offset)::text,
  "serialSort" = serial_max.max_serial + ranked_duplicates.duplicate_offset
FROM serial_max, ranked_duplicates
WHERE record."id" = ranked_duplicates."id";

-- Replace the facility-scoped constraint with a global serial constraint.
DROP INDEX IF EXISTS "BayeganiRecord_facilityNumber_serial_key";

CREATE UNIQUE INDEX "BayeganiRecord_serial_key"
ON "BayeganiRecord"("serial");
