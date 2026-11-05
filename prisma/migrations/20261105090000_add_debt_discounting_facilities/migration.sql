CREATE TABLE "DebtDiscountingFacility" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "contractId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'فعال',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DebtDiscountingFacility_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DebtDiscountingFacility_customerId_idx" ON "DebtDiscountingFacility"("customerId");
CREATE INDEX "DebtDiscountingFacility_contractId_idx" ON "DebtDiscountingFacility"("contractId");
CREATE INDEX "DebtDiscountingFacility_status_idx" ON "DebtDiscountingFacility"("status");

ALTER TABLE "DebtDiscountingFacility"
ADD CONSTRAINT "DebtDiscountingFacility_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DebtDiscountingFacility"
ADD CONSTRAINT "DebtDiscountingFacility_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "BayeganiRecord"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
