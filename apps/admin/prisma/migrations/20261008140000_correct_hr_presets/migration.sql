-- Correct only the original, untouched presets. Company-entered rules retain their values.
-- Bahrain Law 14/2022: pension employer share increases annually through 2028.
WITH corrected AS (
 UPDATE "GosiComponent" SET "employerPercent"=13, "appliesTo"=ARRAY['bahraini'],
 "effectiveTo"='2024-12-31', "notes"='Bahraini pension only. GCC registrations require their home-country scheme.'
 WHERE "code"='pension' AND "createdById" IS NULL AND "employeePercent"=7 AND "employerPercent"=12
 AND "effectiveFrom"='2024-03-01' AND "effectiveTo" IS NULL AND "isActive"=true
 RETURNING *
)
INSERT INTO "GosiComponent" ("id","code","nameEn","nameAr","appliesTo","employeePercent","employerPercent","wageBasis","maxWage","effectiveFrom","effectiveTo","notes")
SELECT gen_random_uuid()::text,c."code",c."nameEn",c."nameAr",c."appliesTo",7,y.rate,c."wageBasis",c."maxWage",y.start_date,y.end_date,
 'Annual pension employer-rate schedule under Bahrain Law 14/2022; occupational hazards are a separate component.'
FROM corrected c CROSS JOIN (VALUES
 (14,'2025-01-01'::date,'2025-12-31'::date),
 (15,'2026-01-01'::date,'2026-12-31'::date),
 (16,'2027-01-01'::date,'2027-12-31'::date),
 (17,'2028-01-01'::date,NULL::date)
) y(rate,start_date,end_date)
WHERE NOT EXISTS (SELECT 1 FROM "GosiComponent" e WHERE e."code"=c."code" AND e."effectiveFrom"=y.start_date);
-- Private-sector employer unemployment contributions are funded by Tamkeen.
UPDATE "GosiComponent"
SET
    "employerPercent" = 0,
    "notes" = 'Employee unemployment contribution 1%; private-sector employer share funded by Tamkeen.'
WHERE
    "code" = 'unemployment'
    AND "createdById" IS NULL
    AND "employeePercent" = 1
    AND "employerPercent" = 1
    AND "effectiveFrom" = '2024-03-01';
-- SIO end-of-service contributions use basic salary (and social allowance where applicable), not gross pay.
UPDATE "GosiComponent"
SET
    "wageBasis" = 'basic',
    "notes" = 'SIO end-of-service scheme from March 2024. Basic salary; configure applicable social allowance separately. 4.2% before three years, 8.4% thereafter.'
WHERE
    "code" = 'end_of_service'
    AND "createdById" IS NULL
    AND "wageBasis" = 'fixed'
    AND "employerPercent" = 4.2
    AND "effectiveFrom" = '2024-03-01';
-- Labour Law Article 116 includes fractions of a year; there is no one-year exclusion.
ALTER TABLE "HrPolicy"
ALTER COLUMN "gratuityRules"
SET DEFAULT '{"enabled":true,"appliesTo":["expat"],"wageBasis":"basic","firstYears":3,"firstYearsMonths":0.5,"laterYearsMonths":1,"minServiceMonths":0,"serviceUntil":"2024-02-29"}';

UPDATE "HrPolicy" SET "gratuityRules"=jsonb_set("gratuityRules",'{minServiceMonths}','0')
WHERE "gratuityRules"='{"enabled":true,"appliesTo":["expat"],"wageBasis":"basic","firstYears":3,"firstYearsMonths":0.5,"laterYearsMonths":1,"minServiceMonths":12,"serviceUntil":"2024-02-29"}'::jsonb;