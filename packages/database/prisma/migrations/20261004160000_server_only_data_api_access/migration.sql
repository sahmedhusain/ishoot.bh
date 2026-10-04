-- Application records are accessed through server-side Prisma, never the anonymous Data API.
-- Conditional roles keep this migration compatible with ordinary PostgreSQL.
DO $$
DECLARE api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."User", public."CompanySetting", public."CompanyAsset", public."HeroBanner", public."PortfolioCategory", public."PortfolioItem", public."ClientLogo", public."StudioEquipment", public."Inquiry", public."InquiryNote", public."WebsiteContent", public."CrmContact", public."CrmDeal", public."Invoice", public."InvoiceLineItem", public."Payment", public."ExpenseCategory", public."Expense", public."CalendarEvent", public."ActivityLog", public."Notification", public."Tag", public."Attachment", public."Permission", public."Session", public."DocumentTemplate", public."Contract", public."MinuteOfMeeting", public."GeneratedDocument", public."CompanyDocument", public."Service", public."SocialLink", public."Role", public."FeatureToggle", public."Review", public."Faq", public."Statistic", public."RevalidationJob", public."UploadObject", public."AbuseWindow", public."MfaRecoveryCode", public."EmailJob", public."IntegrationSetting", public."AuthChallenge", public."Quotation", public."QuotationLineItem", public."CommunicationThread", public."CommunicationMessage", public."MessageAttachment", public."SocialMetric" FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
