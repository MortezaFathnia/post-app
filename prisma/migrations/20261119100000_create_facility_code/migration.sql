CREATE TABLE "FacilityCode" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacilityCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacilityCode_code_key" ON "FacilityCode"("code");

INSERT INTO "FacilityCode" ("code", "name", "updatedAt") VALUES
('414', 'مشارکت مدنی', CURRENT_TIMESTAMP),
('453', 'مشارکت یارانه ای', CURRENT_TIMESTAMP),
('430', 'مشارکت اشتغال پایدار', CURRENT_TIMESTAMP),
('320', 'فروش اقساطی', CURRENT_TIMESTAMP),
('330', 'اشتغال پایدار', CURRENT_TIMESTAMP),
('319', 'اشتغال یارانه ای', CURRENT_TIMESTAMP),
('357', 'سلف امهالی', CURRENT_TIMESTAMP),
('220', 'قرض الحسنه مشاغل خانگی', CURRENT_TIMESTAMP),
('219', 'قرض الحسنه مشاغل خانگی', CURRENT_TIMESTAMP),
('227', 'قرض الحسنه طرح رحمت', CURRENT_TIMESTAMP),
('610', 'مرابحه', CURRENT_TIMESTAMP),
('614', 'مرابحه کارت اعتباری 12 ماهه اقساطی', CURRENT_TIMESTAMP),
('615', 'مرابحه کارت اعتباری 3 ماهه سررسیدی', CURRENT_TIMESTAMP),
('617', 'مرابحه کارت اعتباری 9 ماهه سررسیدی', CURRENT_TIMESTAMP),
('662', 'مرابحه کارت اعتباری 48 ماهه اقساطی', CURRENT_TIMESTAMP),
('663', 'مرابحه کارت اعتباری 60 ماهه اقساطی', CURRENT_TIMESTAMP),
('616', 'مرابحه کارت اعتباری 6 ماهه سررسیدی', CURRENT_TIMESTAMP),
('618', 'مرابحه کارت اعتباری 12 ماهه سررسیدی', CURRENT_TIMESTAMP),
('632', 'مرابحه کارت اعتباری 24 ماهه اقساطی', CURRENT_TIMESTAMP),
('612', 'مرابحه کارت اعتباری 36 ماهه اقساطی', CURRENT_TIMESTAMP),
('209', 'قرض الحسنه ازدواج', CURRENT_TIMESTAMP),
('215', 'قرض الحسنه نیکان', CURRENT_TIMESTAMP),
('401', 'مضاربه', CURRENT_TIMESTAMP),
('647', 'مرابحه کارت اعتباری 6 ماهه اقساطی', CURRENT_TIMESTAMP);
