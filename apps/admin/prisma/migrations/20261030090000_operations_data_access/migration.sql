-- Operations evidence and financial records are only accessed through authorized server services.
DO $$
DECLARE table_name text; api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Branch','BranchGrant','ProductPackagingUnit','StockSerial','SerialGeneration','StockPackage','PackageContent','StockTraceEvent','LabelPrintJob','AccountingAccount','AccountingPeriod','JournalEntry','JournalLine','StockAllocation','StockAllocationLine','StockAcknowledgment'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',table_name,api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
