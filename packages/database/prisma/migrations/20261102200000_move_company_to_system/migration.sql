-- Quiesce company/counter writes before this handoff. Preserve legacy rows until all callers move.
CREATE SCHEMA IF NOT EXISTS system;
CREATE TABLE IF NOT EXISTS system.company (
 id text PRIMARY KEY,
 singleton boolean NOT NULL DEFAULT true UNIQUE CHECK(singleton),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 currency_locked boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 1,
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS system.company_asset (
 id text PRIMARY KEY,
 asset_key text NOT NULL UNIQUE,
 title text NOT NULL,
 file_url text NOT NULL,
 mime_type text,
 file_size bigint,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS system.document_sequence (
 kind text PRIMARY KEY CHECK(kind IN ('invoice','receipt')),
 prefix text NOT NULL,
 next_number bigint NOT NULL CHECK(next_number BETWEEN 1 AND 2147483647)
);
CREATE TABLE IF NOT EXISTS system.number_reservation (
 caller text NOT NULL,
 idempotency_key text NOT NULL,
 kind text NOT NULL,
 document_date date NOT NULL,
 document_number text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(caller,idempotency_key),
 UNIQUE(kind,document_number)
);

DO $$
DECLARE source_id text; imported_id text;
BEGIN
 SELECT id INTO source_id FROM public."CompanySetting" WHERE singleton=1;
 IF source_id IS NULL THEN RETURN;END IF;
 SELECT id INTO imported_id FROM system.company WHERE singleton;
 IF imported_id IS NOT NULL AND imported_id<>source_id THEN
  RAISE EXCEPTION 'Company handoff found a different target identity; reconcile before retrying';
 END IF;
 IF EXISTS(SELECT 1 FROM public."CompanySetting" WHERE "invoiceNextNumber"<1 OR "receiptNextNumber"<1) THEN
  RAISE EXCEPTION 'Company handoff found invalid document counters';
 END IF;
 INSERT INTO system.company(id,data,currency_locked,updated_by,updated_at)
 SELECT c.id,
  jsonb_set(jsonb_set(((to_jsonb(c)-'singleton') || jsonb_build_object('websitePublished',EXISTS(SELECT 1 FROM public."WebsiteContent" WHERE id='main' AND "publishedAt" IS NOT NULL))),'{updatedAt}',to_jsonb(c."updatedAt" AT TIME ZONE 'UTC')),
   '{setupCompletedAt}',COALESCE(to_jsonb(c."setupCompletedAt" AT TIME ZONE 'UTC'),'null'::jsonb)),
  EXISTS(SELECT 1 FROM public."Invoice") OR EXISTS(SELECT 1 FROM public."Quotation") OR
  EXISTS(SELECT 1 FROM public."Payment") OR EXISTS(SELECT 1 FROM public."Expense") OR
  EXISTS(SELECT 1 FROM public."PayrollRun") OR EXISTS(SELECT 1 FROM public."SalesOrder") OR
  EXISTS(SELECT 1 FROM public."PurchaseOrder") OR EXISTS(SELECT 1 FROM public."ExpenseClaim") OR
  EXISTS(SELECT 1 FROM public."RecurringExpense") OR EXISTS(SELECT 1 FROM public."FinalSettlement") OR
  EXISTS(SELECT 1 FROM public."CrmDeal") OR EXISTS(SELECT 1 FROM public."Asset") OR
  EXISTS(SELECT 1 FROM public."Product" WHERE price>0 OR cost>0) OR
  EXISTS(SELECT 1 FROM public."ProductVariant" WHERE price>0 OR cost>0) OR
  EXISTS(SELECT 1 FROM public."PortfolioItem" WHERE price>0) OR
  EXISTS(SELECT 1 FROM public."Service" WHERE "defaultRate">0) OR
  EXISTS(SELECT 1 FROM public."EmploymentRecord" WHERE "basicSalary">0 OR "housingAllowance">0 OR "transportAllowance">0 OR "otherAllowances">0),
  'migration:company-handoff',c."updatedAt" AT TIME ZONE 'UTC'
 FROM public."CompanySetting" c WHERE c.singleton=1 ON CONFLICT(singleton) DO NOTHING;
 INSERT INTO system.document_sequence(kind,prefix,next_number)
 SELECT 'invoice',"invoicePrefix","invoiceNextNumber" FROM public."CompanySetting" WHERE singleton=1
 UNION ALL SELECT 'receipt',"receiptPrefix","receiptNextNumber" FROM public."CompanySetting" WHERE singleton=1
 ON CONFLICT(kind) DO NOTHING;
 INSERT INTO system.company_asset(id,asset_key,title,file_url,mime_type,file_size,created_at,updated_at)
 SELECT id,"assetKey",title,"fileUrl","mimeType","fileSize","createdAt" AT TIME ZONE 'UTC',"updatedAt" AT TIME ZONE 'UTC'
 FROM public."CompanyAsset" ON CONFLICT(asset_key) DO NOTHING;
END $$;
