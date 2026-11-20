-- Replace global serial uniqueness with uniqueness of the facilityNumber + serial pair.
-- PostgreSQL permits multiple rows when either nullable value is NULL.
DROP INDEX IF EXISTS "BayeganiRecord_serial_key";

CREATE UNIQUE INDEX "BayeganiRecord_facilityNumber_serial_key"
ON "BayeganiRecord"("facilityNumber", "serial");
