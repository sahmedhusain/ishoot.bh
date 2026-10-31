-- Enforce period boundaries even for a privileged import that bypasses service validation.
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_no_overlap"
EXCLUDE USING gist (daterange("startsOn", "endsOn", '[]') WITH &&);

CREATE FUNCTION platform_protect_accounting_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.status='closed' THEN RAISE EXCEPTION 'Closed accounting periods are immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status='closed' THEN RAISE EXCEPTION 'Closed accounting periods are immutable'; END IF;
  IF NEW."startsOn" IS DISTINCT FROM OLD."startsOn" OR NEW."endsOn" IS DISTINCT FROM OLD."endsOn" THEN
    RAISE EXCEPTION 'Accounting period dates are immutable';
  END IF;
  IF NEW.status='closed' AND (NEW."closedAt" IS NULL OR NEW."closedById" IS NULL) THEN
    RAISE EXCEPTION 'Closing requires an actor and timestamp';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounting_period_integrity BEFORE UPDATE OR DELETE ON "AccountingPeriod"
FOR EACH ROW EXECUTE FUNCTION platform_protect_accounting_period();
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_closure_metadata"
CHECK ((status='open' AND "closedAt" IS NULL AND "closedById" IS NULL)
    OR (status='closed' AND "closedAt" IS NOT NULL AND "closedById" IS NOT NULL));
