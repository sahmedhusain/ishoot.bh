-- Indexes on foreign keys that lists and reports filter by, found in the 2026-11 platform audit.
CREATE INDEX IF NOT EXISTS "PayrollItem_employeeId_idx" ON "PayrollItem"("employeeId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_leaveTypeId_idx" ON "LeaveRequest"("leaveTypeId");
CREATE INDEX IF NOT EXISTS "SalesOrder_contactId_idx" ON "SalesOrder"("contactId");
CREATE INDEX IF NOT EXISTS "SalesOrder_warehouseId_idx" ON "SalesOrder"("warehouseId");
CREATE INDEX IF NOT EXISTS "Shipment_zoneId_idx" ON "Shipment"("zoneId");
CREATE INDEX IF NOT EXISTS "Shipment_vehicleId_idx" ON "Shipment"("vehicleId");
CREATE INDEX IF NOT EXISTS "AttendanceEntry_shiftTypeId_idx" ON "AttendanceEntry"("shiftTypeId");

-- The unique index on Session.token already serves lookups.
DROP INDEX IF EXISTS "Session_token_idx";
