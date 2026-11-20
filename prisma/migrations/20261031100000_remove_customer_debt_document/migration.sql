-- Customer and DebtDocument are no longer part of the application.
-- The tables may already be absent in databases where they were removed manually.
DROP TABLE IF EXISTS "DebtDocument";
DROP TABLE IF EXISTS "Customer";
