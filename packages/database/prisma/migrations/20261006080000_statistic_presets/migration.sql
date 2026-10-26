-- Website statistics can be typed in or computed from live data.
ALTER TABLE "Statistic"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE "Statistic" ADD COLUMN "preset" TEXT;

ALTER TABLE "Statistic" ADD COLUMN "presetParam" INTEGER;

ALTER TABLE "Statistic" ADD COLUMN "roundTo" INTEGER;

ALTER TABLE "Statistic" ADD COLUMN "suffix" TEXT;

ALTER TABLE "Statistic"
ADD CONSTRAINT "Statistic_source_check" CHECK (
    "source" IN ('manual', 'preset')
);

ALTER TABLE "Statistic"
ADD CONSTRAINT "Statistic_preset_check" CHECK (
    (
        "source" = 'manual'
        AND "preset" IS NULL
    )
    OR (
        "source" = 'preset'
        AND "preset" IN (
            'projects_delivered',
            'clients_served',
            'team_members',
            'portfolio_projects',
            'five_star_reviews',
            'years_in_business'
        )
    )
);

ALTER TABLE "Statistic"
ADD CONSTRAINT "Statistic_roundTo_check" CHECK (
    "roundTo" IS NULL
    OR "roundTo" > 0
);