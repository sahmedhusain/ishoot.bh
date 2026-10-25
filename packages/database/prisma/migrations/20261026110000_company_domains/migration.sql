-- The public website's domain and, optionally, the admin's own domain (setup wizard, Settings → Website).
-- Environment variables (WEB_URL, ADMIN_URL) still win when they are set.
ALTER TABLE "CompanySetting" ADD COLUMN "websiteDomain" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN "adminDomain" TEXT;
