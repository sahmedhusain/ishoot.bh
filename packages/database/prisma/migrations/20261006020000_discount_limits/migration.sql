-- Discount approval margins: a company default and an optional per-user limit (percent of subtotal).
ALTER TABLE "User" ADD COLUMN "discountLimitPercent" DECIMAL(5,2);
ALTER TABLE "User" ADD CONSTRAINT "User_discountLimitPercent_check" CHECK ("discountLimitPercent" IS NULL OR ("discountLimitPercent" >= 0 AND "discountLimitPercent" <= 100));
ALTER TABLE "CompanySetting" ADD COLUMN "defaultDiscountLimitPercent" DECIMAL(5,2) NOT NULL DEFAULT 5.00;
ALTER TABLE "CompanySetting" ADD COLUMN "quotationsAlwaysNeedApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CompanySetting" ADD CONSTRAINT "CompanySetting_defaultDiscountLimitPercent_check" CHECK ("defaultDiscountLimitPercent" >= 0 AND "defaultDiscountLimitPercent" <= 100);
