ALTER TABLE "ContractDetails"
ADD COLUMN IF NOT EXISTS "customerNumber" TEXT;

CREATE INDEX IF NOT EXISTS "ContractDetails_customerNumber_idx"
ON "ContractDetails"("customerNumber");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ContractDetails_customerNumber_fkey'
      AND conrelid = '"ContractDetails"'::regclass
  ) THEN
    ALTER TABLE "ContractDetails"
      ADD CONSTRAINT "ContractDetails_customerNumber_fkey"
      FOREIGN KEY ("customerNumber")
      REFERENCES "Customer"("customerNumber")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BayeganiGuarantee_customerNumber_fkey'
      AND conrelid = '"BayeganiGuarantee"'::regclass
  ) THEN
    ALTER TABLE "BayeganiGuarantee"
      ADD CONSTRAINT "BayeganiGuarantee_customerNumber_fkey"
      FOREIGN KEY ("customerNumber")
      REFERENCES "Customer"("customerNumber")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
