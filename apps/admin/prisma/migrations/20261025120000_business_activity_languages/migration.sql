-- What the company does and which languages it writes in (setup wizard), and more public company details.
ALTER TABLE "CompanySetting" ADD COLUMN "contentLanguages" TEXT[] DEFAULT ARRAY['ar', 'en']::TEXT[];

ALTER TABLE "CompanySetting"
ADD COLUMN "primaryLanguage" TEXT NOT NULL DEFAULT 'ar';

ALTER TABLE "CompanySetting" ADD COLUMN "businessActivity" TEXT;

ALTER TABLE "CompanySetting" ADD COLUMN "taglineEn" TEXT;

ALTER TABLE "CompanySetting" ADD COLUMN "taglineAr" TEXT;

ALTER TABLE "CompanySetting" ADD COLUMN "foundedYear" INTEGER;

ALTER TABLE "CompanySetting" ADD COLUMN "city" TEXT;

ALTER TABLE "CompanySetting" ADD COLUMN "country" TEXT;

ALTER TABLE "CompanySetting" ADD COLUMN "mapUrl" TEXT;

-- Website catalogue items are no longer only media projects: products, properties, menu items, courses…
ALTER TABLE "PortfolioItem" ALTER COLUMN "clientName" DROP NOT NULL;

ALTER TABLE "PortfolioItem" ALTER COLUMN "year" DROP NOT NULL;

ALTER TABLE "PortfolioItem" ADD COLUMN "subtitleEn" TEXT;

ALTER TABLE "PortfolioItem" ADD COLUMN "subtitleAr" TEXT;

ALTER TABLE "PortfolioItem" ADD COLUMN "price" DECIMAL(12, 3);

ALTER TABLE "PortfolioItem" ADD COLUMN "priceNoteEn" TEXT;

ALTER TABLE "PortfolioItem" ADD COLUMN "priceNoteAr" TEXT;

ALTER TABLE "PortfolioItem" ADD COLUMN "location" TEXT;

ALTER TABLE "PortfolioItem" ADD COLUMN "externalUrl" TEXT;

ALTER TABLE "PortfolioItem"
ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '[]';

-- Companies already running keep the media website they were built with.
UPDATE "CompanySetting"
SET
    "businessActivity" = 'media'
WHERE
    "setupCompletedAt" IS NOT NULL
    AND "businessActivity" IS NULL;