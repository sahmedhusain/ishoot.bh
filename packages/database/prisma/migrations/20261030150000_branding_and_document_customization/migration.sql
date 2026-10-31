-- Branding enhancements: full-sized logo (combined icon + text) and custom document header/footer
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "timeZone" TEXT DEFAULT 'Asia/Bahrain';
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "fullLogoUrl" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "darkFullLogoUrl" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "documentHeaderUrl" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "documentFooterUrl" TEXT;
