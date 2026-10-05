-- Six-monthly wage-support (Tamkeen) reimbursements received per employee.
-- CreateTable
CREATE TABLE "SupportReimbursement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "claimedAmount" DECIMAL(12,3) NOT NULL,
    "receivedAmount" DECIMAL(12,3) NOT NULL,
    "receivedOn" DATE NOT NULL,
    "reference" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportReimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportReimbursement_employeeId_provider_periodStart_key" ON "SupportReimbursement"("employeeId", "provider", "periodStart");

-- AddForeignKey
ALTER TABLE "SupportReimbursement" ADD CONSTRAINT "SupportReimbursement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportReimbursement" ADD CONSTRAINT "SupportReimbursement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "SupportReimbursement" ADD CONSTRAINT "SupportReimbursement_period_check" CHECK ("periodStart" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "periodEnd" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "periodEnd" >= "periodStart");
ALTER TABLE "SupportReimbursement" ADD CONSTRAINT "SupportReimbursement_amount_check" CHECK ("claimedAmount" >= 0 AND "receivedAmount" >= 0);
