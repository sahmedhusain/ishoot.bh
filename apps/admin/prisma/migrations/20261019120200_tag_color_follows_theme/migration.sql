-- New tags get a neutral default colour instead of a fixed brand colour.
ALTER TABLE "Tag" ALTER COLUMN "color" SET DEFAULT '#2563EB';