-- AlterTable
ALTER TABLE "User"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT,
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedById" TEXT,
ADD COLUMN "suspensionReason" TEXT;

-- AlterTable
ALTER TABLE "Inquiry"
ADD COLUMN "requestType" TEXT NOT NULL DEFAULT 'inquiry',
ADD COLUMN "slaDueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Invoice"
ADD COLUMN "approvalRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN "contentHash" TEXT;

-- AlterTable
ALTER TABLE "Expense"
ADD COLUMN "inputVatAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
ADD COLUMN "isVatRecoverable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "netAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
ADD COLUMN "taxInvoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "Notification"
ADD COLUMN "actionUrl" TEXT,
ADD COLUMN "eventKey" TEXT,
ADD COLUMN "messageKey" TEXT,
ADD COLUMN "messageParams" JSONB;

-- AlterTable
ALTER TABLE "Quotation"
ADD COLUMN "approvalRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "contentHash" TEXT,
ADD COLUMN "effectiveRate" DECIMAL(14, 6),
ADD COLUMN "fxMarginPercent" DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
ADD COLUMN "rawRate" DECIMAL(14, 6);

-- CreateTable
CREATE TABLE "ProfileChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "managerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "oldValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "diffPayload" JSONB,
    "discountReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedById" TEXT NOT NULL,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceSequence" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReferenceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestEvent" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestAssignment" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "team" TEXT,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestComment" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RequestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRateSnapshot" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(14, 6) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "sourceEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFx" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "baseAmount" DECIMAL(12, 3) NOT NULL,
    "targetAmount" DECIMAL(12, 3) NOT NULL,
    "rawRate" DECIMAL(14, 6) NOT NULL,
    "marginPercent" DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
    "effectiveRate" DECIMAL(14, 6) NOT NULL,
    "rateSnapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentFx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(12, 3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankSettlement" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "settlementDate" DATE NOT NULL,
    "receivedAmount" DECIMAL(12, 3) NOT NULL,
    "receivedCurrency" TEXT NOT NULL,
    "settledAmountBhd" DECIMAL(12, 3) NOT NULL,
    "bankFeeBhd" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "fxGainLossBhd" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "bankReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'settled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "userId" TEXT,
    "departmentId" TEXT,
    "firstNameEn" TEXT NOT NULL,
    "lastNameEn" TEXT NOT NULL,
    "firstNameAr" TEXT NOT NULL,
    "lastNameAr" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cprNumber" TEXT,
    "jobTitleEn" TEXT NOT NULL,
    "jobTitleAr" TEXT NOT NULL,
    "hireDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "leaveBalanceDays" DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractType" TEXT NOT NULL DEFAULT 'full_time',
    "basicSalary" DECIMAL(12, 3) NOT NULL,
    "housingAllowance" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "transportAllowance" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "otherAllowances" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmploymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "daysAllowedPerYear" DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "fullDay" BOOLEAN NOT NULL DEFAULT true,
    "hours" DECIMAL(4, 2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'present',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "coverageDetails" TEXT,
    "employerContribution" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "employeeContribution" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BenefitPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalGross" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "totalDeductions" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "totalNet" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "totalEmployerCost" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "housingAllowance" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "transportAllowance" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "otherAllowances" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "grossSalary" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "gosiEmployee" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "gosiEmployer" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "otherDeductions" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "netSalary" DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "storagePath" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileChangeRequest_userId_status_idx" ON "ProfileChangeRequest" ("userId", "status");

-- CreateIndex
CREATE INDEX "ProfileChangeRequest_managerId_status_idx" ON "ProfileChangeRequest" ("managerId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_targetType_idx" ON "ApprovalRequest" ("status", "targetType");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedById_idx" ON "ApprovalRequest" ("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_targetType_targetId_revision_key" ON "ApprovalRequest" (
    "targetType",
    "targetId",
    "revision"
);

-- CreateIndex
CREATE INDEX "ApprovalDecision_approvalRequestId_idx" ON "ApprovalDecision" ("approvalRequestId");

-- CreateIndex
CREATE INDEX "ApprovalDecision_decidedById_idx" ON "ApprovalDecision" ("decidedById");

-- CreateIndex
CREATE INDEX "RequestEvent_inquiryId_createdAt_idx" ON "RequestEvent" ("inquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestAssignment_inquiryId_active_idx" ON "RequestAssignment" ("inquiryId", "active");

-- CreateIndex
CREATE INDEX "RequestAssignment_assignedToId_active_idx" ON "RequestAssignment" ("assignedToId", "active");

-- CreateIndex
CREATE INDEX "RequestComment_inquiryId_createdAt_idx" ON "RequestComment" ("inquiryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateSnapshot_baseCurrency_quoteCurrency_effectiveDa_key" ON "ExchangeRateSnapshot" (
    "baseCurrency",
    "quoteCurrency",
    "effectiveDate"
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFx_documentType_documentId_key" ON "DocumentFx" ("documentType", "documentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation" ("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_invoiceId_idx" ON "PaymentAllocation" ("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "BankSettlement_paymentId_key" ON "BankSettlement" ("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department" ("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee" ("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee" ("userId");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee" ("departmentId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee" ("status");

-- CreateIndex
CREATE INDEX "EmploymentRecord_employeeId_isCurrent_idx" ON "EmploymentRecord" ("employeeId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_code_key" ON "LeaveType" ("code");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_status_idx" ON "LeaveRequest" ("employeeId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest" ("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEntry_employeeId_date_key" ON "AttendanceEntry" ("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitPlan_code_key" ON "BenefitPlan" ("code");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_year_month_key" ON "PayrollRun" ("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_payrollRunId_employeeId_key" ON "PayrollItem" ("payrollRunId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollItemId_key" ON "Payslip" ("payrollItemId");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_year_month_idx" ON "Payslip" ("employeeId", "year", "month");

-- CreateIndex
CREATE INDEX "Invoice_approvalStatus_idx" ON "Invoice" ("approvalStatus");

-- CreateIndex
CREATE INDEX "Notification_eventKey_idx" ON "Notification" ("eventKey");

-- AddForeignKey
ALTER TABLE "ProfileChangeRequest"
ADD CONSTRAINT "ProfileChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChangeRequest"
ADD CONSTRAINT "ProfileChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChangeRequest"
ADD CONSTRAINT "ProfileChangeRequest_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest"
ADD CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision"
ADD CONSTRAINT "ApprovalDecision_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision"
ADD CONSTRAINT "ApprovalDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent"
ADD CONSTRAINT "RequestEvent_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent"
ADD CONSTRAINT "RequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAssignment"
ADD CONSTRAINT "RequestAssignment_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAssignment"
ADD CONSTRAINT "RequestAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAssignment"
ADD CONSTRAINT "RequestAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestComment"
ADD CONSTRAINT "RequestComment_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestComment"
ADD CONSTRAINT "RequestComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation"
ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation"
ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSettlement"
ADD CONSTRAINT "BankSettlement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentRecord"
ADD CONSTRAINT "EmploymentRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEntry"
ADD CONSTRAINT "AttendanceEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem"
ADD CONSTRAINT "PayrollItem_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem"
ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip"
ADD CONSTRAINT "Payslip_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip"
ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;