-- Add a stable surrogate primary key and postal code to Customer.
-- Preserve nationalCode as a unique key because ContractCustomer references it.
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "id" INTEGER,
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT;

CREATE SEQUENCE IF NOT EXISTS "Customer_id_seq" OWNED BY "Customer"."id";
ALTER TABLE "Customer"
  ALTER COLUMN "id" SET DEFAULT nextval('"Customer_id_seq"');

UPDATE "Customer"
SET "id" = nextval('"Customer_id_seq"')
WHERE "id" IS NULL;

SELECT setval(
  '"Customer_id_seq"',
  COALESCE((SELECT MAX("id") FROM "Customer"), 0) + 1,
  false
);

ALTER TABLE "Customer" ALTER COLUMN "id" SET NOT NULL;

-- Keep the association FK valid while replacing the old nationalCode PK.
ALTER TABLE "ContractCustomer"
  DROP CONSTRAINT IF EXISTS "ContractCustomer_nationalCode_fkey";

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_nationalCode_key"
  ON "Customer"("nationalCode");

ALTER TABLE "Customer"
  DROP CONSTRAINT IF EXISTS "Customer_pkey";

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_pkey" PRIMARY KEY ("id");

ALTER TABLE "ContractCustomer"
  ADD CONSTRAINT "ContractCustomer_nationalCode_fkey"
  FOREIGN KEY ("nationalCode") REFERENCES "Customer"("nationalCode")
  ON DELETE CASCADE ON UPDATE CASCADE;
