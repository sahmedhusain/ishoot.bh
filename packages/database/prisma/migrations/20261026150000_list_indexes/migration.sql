-- Lists page through records newest first and people by name; these keep them fast at tens of thousands of rows.
CREATE INDEX "User_fullName_idx" ON "User"("fullName");
CREATE INDEX "User_isActive_archivedAt_idx" ON "User"("isActive", "archivedAt");
CREATE INDEX "Employee_firstNameEn_lastNameEn_idx" ON "Employee"("firstNameEn", "lastNameEn");
CREATE INDEX "CrmDeal_createdAt_idx" ON "CrmDeal"("createdAt");
CREATE INDEX "Expense_createdAt_idx" ON "Expense"("createdAt");
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX "Quotation_createdAt_idx" ON "Quotation"("createdAt");
CREATE INDEX "CrmContact_createdAt_idx" ON "CrmContact"("createdAt");
CREATE INDEX "LeaveRequest_createdAt_idx" ON "LeaveRequest"("createdAt");
CREATE INDEX "ExpenseClaim_createdAt_idx" ON "ExpenseClaim"("createdAt");
CREATE INDEX "Inquiry_workflowStatus_createdAt_idx" ON "Inquiry"("workflowStatus", "createdAt");
