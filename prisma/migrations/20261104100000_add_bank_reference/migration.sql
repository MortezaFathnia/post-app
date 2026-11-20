CREATE TABLE "Bank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Bank_bankId_key" ON "Bank"("bankId");
CREATE UNIQUE INDEX "Bank_name_key" ON "Bank"("name");

INSERT INTO "Bank" ("name", "bankId", "updatedAt") VALUES
('بانک مرکزی', '10', CURRENT_TIMESTAMP),
('بانک صنعت و معدن', '11', CURRENT_TIMESTAMP),
('بانک ملت', '12', CURRENT_TIMESTAMP),
('بانک رفاه', '13', CURRENT_TIMESTAMP),
('بانک مسکن', '14', CURRENT_TIMESTAMP),
('بانک سپه', '15', CURRENT_TIMESTAMP),
('بانک کشاورزی', '16', CURRENT_TIMESTAMP),
('بانک ملی ایران', '17', CURRENT_TIMESTAMP),
('بانک تجارت', '18', CURRENT_TIMESTAMP),
('بانک صادرات ایران', '19', CURRENT_TIMESTAMP),
('بانک توسعه صادرات', '20', CURRENT_TIMESTAMP),
('پست بانک ایران', '21', CURRENT_TIMESTAMP),
('بانک توسعه تعاون', '22', CURRENT_TIMESTAMP),
('موسسه اعتباري توسعه', '51', CURRENT_TIMESTAMP),
('بانک کارآفرین', '53', CURRENT_TIMESTAMP),
('بانک پارسیان', '54', CURRENT_TIMESTAMP),
('بانک اقتصاد نوین', '55', CURRENT_TIMESTAMP),
('بانک سامان', '56', CURRENT_TIMESTAMP),
('بانک پاسارگاد', '57', CURRENT_TIMESTAMP),
('بانک سرمایه', '58', CURRENT_TIMESTAMP),
('بانک سینا', '59', CURRENT_TIMESTAMP),
('قرض الحسنه مهر ايران', '60', CURRENT_TIMESTAMP),
('بانک شهر', '61', CURRENT_TIMESTAMP),
('بانک تات', '62', CURRENT_TIMESTAMP),
('بانک انصار', '63', CURRENT_TIMESTAMP),
('گردشگري', '64', CURRENT_TIMESTAMP),
('حكمت ايرانيان', '65', CURRENT_TIMESTAMP),
('بانک دی', '66', CURRENT_TIMESTAMP),
('ايران زمين', '69', CURRENT_TIMESTAMP);
