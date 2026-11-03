-- Company theme (colours, fonts, radius, default mode) chosen in the setup wizard.
ALTER TABLE "CompanySetting" ADD COLUMN "theme" JSONB;

ALTER TABLE "CompanySetting"
ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

-- Companies already running are set up; only a fresh install sees the setup wizard.
UPDATE "CompanySetting"
SET
    "setupCompletedAt" = CURRENT_TIMESTAMP
WHERE
    "setupCompletedAt" IS NULL;