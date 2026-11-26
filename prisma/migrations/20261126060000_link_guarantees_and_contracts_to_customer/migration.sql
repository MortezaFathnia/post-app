ALTER TABLE "ContractDetails" ADD COLUMN "customerNumber" TEXT;
ALTER TABLE "ContractDetails" ADD CONSTRAINT "ContractDetails_customerNumber_fkey"
FOREIGN KEY ("customerNumber") REFERENCES "Customer"("customerNumber")
ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ContractDetails_customerNumber_idx" ON "ContractDetails"("customerNumber");

ALTER TABLE "BayeganiGuarantee" ADD CONSTRAINT "BayeganiGuarantee_customerNumber_fkey"
FOREIGN KEY ("customerNumber") REFERENCES "Customer"("customerNumber")
ON DELETE SET NULL ON UPDATE CASCADE;
