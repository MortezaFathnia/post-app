-- Link BayeganiRecord.nationalId to Customer.nationalCode.
UPDATE "Customer" SET "nationalCode" = NULLIF(BTRIM("nationalCode"), '') WHERE "nationalCode" IS NOT NULL;
WITH ranked AS (
 SELECT "id", "nationalCode",
 FIRST_VALUE("name") OVER (PARTITION BY "nationalCode" ORDER BY ("name" IS NULL), "id") AS "keepName",
 FIRST_VALUE("lastName") OVER (PARTITION BY "nationalCode" ORDER BY ("lastName" IS NULL), "id") AS "keepLastName",
 ROW_NUMBER() OVER (PARTITION BY "nationalCode" ORDER BY "id") AS rn
 FROM "Customer" WHERE "nationalCode" IS NOT NULL
)
UPDATE "Customer" c SET "name"=COALESCE(c."name",r."keepName"), "lastName"=COALESCE(c."lastName",r."keepLastName") FROM ranked r WHERE c."id"=r."id" AND r.rn=1;
DELETE FROM "Customer" d USING "Customer" k WHERE d."nationalCode" IS NOT NULL AND d."nationalCode"=k."nationalCode" AND d."id">k."id";
UPDATE "BayeganiRecord" SET "nationalId"=NULLIF(BTRIM("nationalId"), '') WHERE "nationalId" IS NOT NULL;
INSERT INTO "Customer" ("nationalCode","name","lastName","updatedAt")
SELECT DISTINCT ON (BTRIM(r."nationalId")) BTRIM(r."nationalId"), NULLIF(BTRIM(r."rawData"->>'نام'), ''), NULLIF(BTRIM(r."rawData"->>'نام خانوادگی'), ''), CURRENT_TIMESTAMP
FROM "BayeganiRecord" r WHERE r."nationalId" IS NOT NULL AND BTRIM(r."nationalId")<>'' AND NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c."nationalCode"=BTRIM(r."nationalId"))
ORDER BY BTRIM(r."nationalId"),r."id";
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_nationalCode_key" ON "Customer"("nationalCode");
CREATE INDEX IF NOT EXISTS "BayeganiRecord_nationalId_idx" ON "BayeganiRecord"("nationalId");
ALTER TABLE "BayeganiRecord" ADD CONSTRAINT "BayeganiRecord_nationalId_fkey" FOREIGN KEY ("nationalId") REFERENCES "Customer"("nationalCode") ON DELETE SET NULL ON UPDATE CASCADE;
