-- Stop on historical conflicts: never guess role ownership or company identity.
DO $$ BEGIN
  IF (SELECT count(*) FROM "CompanySetting") > 1 THEN
    RAISE EXCEPTION 'Reconcile multiple CompanySetting rows before this migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "User" u LEFT JOIN "Role" r ON r.id=u.role WHERE r.id IS NULL)
     OR EXISTS (SELECT 1 FROM "Permission" p LEFT JOIN "Role" r ON r.id=p.role WHERE r.id IS NULL) THEN
    RAISE EXCEPTION 'Reconcile unknown User/Permission roles before this migration';
  END IF;
END $$;
ALTER TABLE "User" ADD CONSTRAINT "User_role_fkey" FOREIGN KEY (role) REFERENCES "Role"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_role_fkey" FOREIGN KEY (role) REFERENCES "Role"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySetting" ADD COLUMN singleton INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "CompanySetting_singleton_key" ON "CompanySetting"(singleton);
ALTER TABLE "CompanySetting" ADD CONSTRAINT "CompanySetting_singleton_check" CHECK (singleton=1);
ALTER TABLE "CompanySetting" ALTER COLUMN "companyNameEn" DROP DEFAULT, ALTER COLUMN "companyNameAr" DROP DEFAULT;
ALTER TABLE "CrmDeal" ADD COLUMN "sourceInquiryId" TEXT;
-- Only backfill unambiguous live conversions; duplicate audit evidence is a repair gate.
DO $$ BEGIN
  IF EXISTS (SELECT a.details->>'convertedFromInquiry' FROM "ActivityLog" a JOIN "CrmDeal" d ON d.id=a."entityId" JOIN "Inquiry" i ON i.id=a.details->>'convertedFromInquiry' WHERE a."entityType"='deal' AND a.action='create' GROUP BY a.details->>'convertedFromInquiry' HAVING count(DISTINCT d.id)>1)
  OR EXISTS (SELECT d.id FROM "ActivityLog" a JOIN "CrmDeal" d ON d.id=a."entityId" JOIN "Inquiry" i ON i.id=a.details->>'convertedFromInquiry' WHERE a."entityType"='deal' AND a.action='create' GROUP BY d.id HAVING count(DISTINCT i.id)>1) THEN
    RAISE EXCEPTION 'Reconcile ambiguous historical inquiry conversions before this migration';
  END IF;
END $$;
UPDATE "CrmDeal" d SET "sourceInquiryId"=a.details->>'convertedFromInquiry' FROM "ActivityLog" a JOIN "Inquiry" i ON i.id=a.details->>'convertedFromInquiry' WHERE d.id=a."entityId" AND a."entityType"='deal' AND a.action='create';
CREATE UNIQUE INDEX "CrmDeal_sourceInquiryId_key" ON "CrmDeal"("sourceInquiryId");
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_sourceInquiryId_fkey" FOREIGN KEY ("sourceInquiryId") REFERENCES "Inquiry"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
