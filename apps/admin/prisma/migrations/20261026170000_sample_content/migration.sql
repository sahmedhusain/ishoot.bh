-- Sample content (setup wizard "Start with sample content") is marked, so one click removes it all.
-- AlterTable
ALTER TABLE "CmsArticle"
ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Faq"
ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "HeroBanner"
ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PortfolioItem"
ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Service"
ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Statistic"
ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;