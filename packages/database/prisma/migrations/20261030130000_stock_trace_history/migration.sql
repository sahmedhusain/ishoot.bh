CREATE FUNCTION platform_reject_stock_trace_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Stock trace history is immutable'; END $$;
CREATE TRIGGER stock_trace_immutable BEFORE UPDATE OR DELETE ON "StockTraceEvent"
FOR EACH ROW EXECUTE FUNCTION platform_reject_stock_trace_mutation();
