-- Validate final transaction state so paired movements can move identities and quantities atomically.
CREATE FUNCTION platform_check_serial_balance(product_id text, variant_key text, location_id text, batch_key text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE physical numeric; identities bigint;
BEGIN
  IF location_id IS NULL THEN RETURN; END IF;
  SELECT "onHand" INTO physical FROM "StockLevel"
    WHERE "productId"=product_id AND "variantKey"=variant_key AND "locationId"=location_id AND "batchKey"=batch_key FOR UPDATE;
  SELECT COUNT(*) INTO identities FROM "StockSerial"
    WHERE "productId"=product_id AND "variantKey"=variant_key AND "locationId"=location_id AND "batchKey"=batch_key AND status<>'void';
  IF identities>COALESCE(physical,0) THEN RAISE EXCEPTION 'Stock movement requires assigned serial identifiers'; END IF;
END $$;
CREATE FUNCTION platform_validate_serial_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN
    PERFORM platform_check_serial_balance(OLD."productId",OLD."variantKey",OLD."locationId",OLD."batchKey");
  END IF;
  IF TG_OP<>'DELETE' THEN
    PERFORM platform_check_serial_balance(NEW."productId",NEW."variantKey",NEW."locationId",NEW."batchKey");
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER serial_stock_conservation AFTER INSERT OR UPDATE OR DELETE ON "StockSerial"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform_validate_serial_balance();
CREATE CONSTRAINT TRIGGER stock_serial_conservation AFTER INSERT OR UPDATE OR DELETE ON "StockLevel"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform_validate_serial_balance();
