-- Set every existing archive record to فعال as requested.
-- Keep the JSON payload in sync with the indexed status column.
UPDATE "BayeganiRecord"
SET
  "status" = 'فعال',
  "rawData" = jsonb_set(
    COALESCE("rawData"::jsonb, '{}'::jsonb),
    '{وضعیت کنونی}',
    '"فعال"'::jsonb,
    true
  )::json;

ALTER TABLE "BayeganiRecord"
ALTER COLUMN "status" SET DEFAULT 'فعال';
