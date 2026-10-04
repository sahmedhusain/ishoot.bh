CREATE INDEX "User_role_idx" ON "User"(role);
ALTER TABLE "CompanySetting" ADD CONSTRAINT "CompanySetting_names_check" CHECK (length(trim("companyNameEn"))>0 AND length(trim("companyNameAr"))>0);
