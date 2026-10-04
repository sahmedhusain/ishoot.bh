-- Additive indexes only; apply through the normal migration deployment.
CREATE INDEX "InvoiceLineItem_invoiceId_displayOrder_idx" ON "InvoiceLineItem"("invoiceId", "displayOrder");
CREATE INDEX "Expense_currency_expenseDate_idx" ON "Expense"("currency", "expenseDate");
CREATE INDEX "CalendarEvent_startDate_idx" ON "CalendarEvent"("startDate");
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX "Attachment_entityType_entityId_createdAt_idx" ON "Attachment"("entityType", "entityId", "createdAt");
CREATE INDEX "Attachment_fileUrl_idx" ON "Attachment"("fileUrl");
