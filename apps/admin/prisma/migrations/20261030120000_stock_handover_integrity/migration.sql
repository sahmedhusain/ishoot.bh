ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_distinct_locations"
CHECK ("sourceLocationId"<>"transitLocationId" AND "sourceLocationId"<>"destinationLocationId" AND "transitLocationId"<>"destinationLocationId");
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_source_fk" FOREIGN KEY ("sourceLocationId") REFERENCES "StockLocation"(id) ON DELETE RESTRICT;
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_transit_fk" FOREIGN KEY ("transitLocationId") REFERENCES "StockLocation"(id) ON DELETE RESTRICT;
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_destination_fk" FOREIGN KEY ("destinationLocationId") REFERENCES "StockLocation"(id) ON DELETE RESTRICT;
ALTER TABLE "StockAllocationLine" ADD CONSTRAINT "Allocation_quantities_check"
CHECK (requested>0 AND dispatched>=0 AND dispatched<=requested AND received>=0 AND rejected>=0 AND received+rejected<=dispatched);
CREATE FUNCTION platform_reject_handover_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Signed handover evidence is immutable'; END $$;
CREATE TRIGGER handover_immutable BEFORE UPDATE OR DELETE ON "StockAcknowledgment"
FOR EACH ROW EXECUTE FUNCTION platform_reject_handover_mutation();
