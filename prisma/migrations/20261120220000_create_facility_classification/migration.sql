CREATE TABLE "FacilityClassification" (
    "id" SERIAL NOT NULL,
    "classification" INTEGER NOT NULL,
    "facilityType" TEXT,
    "duration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FacilityClassification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacilityClassification_classification_key" ON "FacilityClassification"("classification");

INSERT INTO "FacilityClassification" ("classification", "facilityType", "duration", "updatedAt") VALUES
(10, 'ضمان', NULL, CURRENT_TIMESTAMP),
(20, 'خرید دین', NULL, CURRENT_TIMESTAMP),
(30, NULL, '1-12', CURRENT_TIMESTAMP),
(40, NULL, '24-36', CURRENT_TIMESTAMP),
(50, NULL, '>36', CURRENT_TIMESTAMP),
(60, 'رحمت غیر حضوری', NULL, CURRENT_TIMESTAMP),
(61, 'رحمت حضوری', NULL, CURRENT_TIMESTAMP);
