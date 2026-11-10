-- Convert DebtDocument into the facility master table.
-- Recreate the table shell if an earlier migration removed it.
CREATE TABLE IF NOT EXISTS "DebtDocument" (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Keep existing rows, but remove the former customer/document-specific columns.
ALTER TABLE "DebtDocument"
  DROP CONSTRAINT IF EXISTS "DebtDocument_customerId_fkey";

ALTER TABLE "DebtDocument"
  DROP COLUMN IF EXISTS "customerId",
  DROP COLUMN IF EXISTS "documentType",
  DROP COLUMN IF EXISTS "dueDate",
  DROP COLUMN IF EXISTS "serialNumber",
  DROP COLUMN IF EXISTS "nominalAmount",
  DROP COLUMN IF EXISTS "nominalAmountWords",
  DROP COLUMN IF EXISTS "paidAmount",
  DROP COLUMN IF EXISTS "paidAmountWords",
  DROP COLUMN IF EXISTS "obligorName",
  DROP COLUMN IF EXISTS "description",
  ADD COLUMN IF NOT EXISTS "contractId" INTEGER,
  ADD COLUMN IF NOT EXISTS "facilityNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "facilityTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "counterLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "serial" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'فعال',
  ADD COLUMN IF NOT EXISTS "startDate" TEXT,
  ADD COLUMN IF NOT EXISTS "endDate" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "DebtDocument_contractId_key"
  ON "DebtDocument"("contractId");

CREATE INDEX IF NOT EXISTS "DebtDocument_facilityNumber_idx"
  ON "DebtDocument"("facilityNumber");

CREATE INDEX IF NOT EXISTS "DebtDocument_status_idx"
  ON "DebtDocument"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DebtDocument_contractId_fkey'
  ) THEN
    ALTER TABLE "DebtDocument"
      ADD CONSTRAINT "DebtDocument_contractId_fkey"
      FOREIGN KEY ("contractId") REFERENCES "BayeganiRecord"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
