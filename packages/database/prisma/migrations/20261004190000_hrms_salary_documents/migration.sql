-- AlterTable
ALTER TABLE "EmailJob" ALTER COLUMN "momId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EmploymentRecord" ADD COLUMN "payrollSettings" JSONB;

-- AlterTable
ALTER TABLE "PayrollItem"
ADD COLUMN "calculationSnapshot" JSONB,
ADD COLUMN "externalSupport" DECIMAL(12, 3) NOT NULL DEFAULT 0.000;

-- CreateTable
CREATE TABLE "SalaryDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "months" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalaryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryDocument_employeeId_createdAt_idx" ON "SalaryDocument" ("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "SalaryDocument_status_idx" ON "SalaryDocument" ("status");

-- AddForeignKey
ALTER TABLE "SalaryDocument"
ADD CONSTRAINT "SalaryDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;