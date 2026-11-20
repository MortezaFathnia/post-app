-- Allow one customer (national code) to be linked to multiple contracts.
-- Keep legacy Customer.contractCode/role columns nullable for compatibility.
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_contractCode_fkey";
DROP INDEX IF EXISTS "Customer_contractCode_role_key";
ALTER TABLE "Customer" ALTER COLUMN "contractCode" DROP NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "role" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "ContractCustomer" (
  "contractCode" TEXT NOT NULL,
  "nationalCode" TEXT NOT NULL,
  "role" "CustomerRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractCustomer_pkey" PRIMARY KEY ("contractCode", "nationalCode"),
  CONSTRAINT "ContractCustomer_contractCode_fkey" FOREIGN KEY ("contractCode")
    REFERENCES "ContractDetails"("contractCode") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContractCustomer_nationalCode_fkey" FOREIGN KEY ("nationalCode")
    REFERENCES "Customer"("nationalCode") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContractCustomer_contractCode_role_key"
  ON "ContractCustomer"("contractCode", "role");
CREATE INDEX IF NOT EXISTS "ContractCustomer_nationalCode_idx"
  ON "ContractCustomer"("nationalCode");
