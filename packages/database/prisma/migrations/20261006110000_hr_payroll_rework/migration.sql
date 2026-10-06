-- AlterTable
ALTER TABLE "AttendanceEntry" ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeHolidayMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeNightMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeRestDayMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recordedById" TEXT,
ADD COLUMN     "shiftTypeId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CommissionPayout" ADD COLUMN     "payrollItemId" TEXT;

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "dayPortion" TEXT NOT NULL DEFAULT 'full',
ADD COLUMN     "days" DECIMAL(6,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "accrual" TEXT NOT NULL DEFAULT 'annual',
ADD COLUMN     "allowHalfDay" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowHours" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "countCalendarDays" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eligibleAfterMonths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxCarryOverDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "maxDaysPerRequest" DECIMAL(5,2),
ADD COLUMN     "payPercent" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "payTiers" JSONB,
ADD COLUMN     "requiresAttachment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PayrollItem" ADD COLUMN     "absenceDeduction" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
ADD COLUMN     "attendanceSummary" JSONB,
ADD COLUMN     "commission" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
ADD COLUMN     "latenessDeduction" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
ADD COLUMN     "leaveDeduction" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
ADD COLUMN     "overtimePay" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidById" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "shiftAllowance" DECIMAL(12,3) NOT NULL DEFAULT 0.000;

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "attendanceEnd" DATE,
ADD COLUMN     "attendanceStart" DATE,
ADD COLUMN     "payDate" DATE;

-- CreateTable
CREATE TABLE "LeaveAdjustment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "days" DECIMAL(6,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "salaryTiming" TEXT NOT NULL DEFAULT 'arrears',
    "payDay" INTEGER NOT NULL DEFAULT 1,
    "attendanceCutoffDay" INTEGER,
    "weekendDays" INTEGER[] DEFAULT ARRAY[5, 6]::INTEGER[],
    "workdayHours" DECIMAL(4,2) NOT NULL DEFAULT 8,
    "workdayStart" TEXT NOT NULL DEFAULT '08:00',
    "dailyRateBasis" TEXT NOT NULL DEFAULT '30',
    "deductionBase" TEXT NOT NULL DEFAULT 'fixed',
    "overtimeBase" TEXT NOT NULL DEFAULT 'basic',
    "overtimeRate" DECIMAL(4,2) NOT NULL DEFAULT 1.25,
    "overtimeNightRate" DECIMAL(4,2) NOT NULL DEFAULT 1.50,
    "overtimeRestDayRate" DECIMAL(4,2) NOT NULL DEFAULT 1.50,
    "overtimeHolidayRate" DECIMAL(4,2) NOT NULL DEFAULT 2.00,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 15,
    "deductLateness" BOOLEAN NOT NULL DEFAULT false,
    "unmarkedDays" TEXT NOT NULL DEFAULT 'present',
    "prorateJoiners" BOOLEAN NOT NULL DEFAULT true,
    "commissionInPayroll" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "allowanceMode" TEXT NOT NULL DEFAULT 'fixed',
    "allowanceValue" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShiftType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveAdjustment_employeeId_leaveTypeId_year_idx" ON "LeaveAdjustment"("employeeId", "leaveTypeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PublicHoliday_date_key" ON "PublicHoliday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftType_code_key" ON "ShiftType"("code");

-- CreateIndex
CREATE INDEX "AttendanceEntry_date_idx" ON "AttendanceEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayout_payrollItemId_key" ON "CommissionPayout"("payrollItemId");

-- AddForeignKey
ALTER TABLE "LeaveAdjustment" ADD CONSTRAINT "LeaveAdjustment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveAdjustment" ADD CONSTRAINT "LeaveAdjustment_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Value checks
ALTER TABLE "HrPolicy" ADD CONSTRAINT "HrPolicy_values_check" CHECK (
  "id" = 'default'
  AND "salaryTiming" IN ('arrears', 'current')
  AND "payDay" BETWEEN 1 AND 31
  AND ("attendanceCutoffDay" IS NULL OR "attendanceCutoffDay" BETWEEN 1 AND 28)
  AND "dailyRateBasis" IN ('30', 'calendar_days', 'working_days')
  AND "deductionBase" IN ('basic', 'fixed') AND "overtimeBase" IN ('basic', 'fixed')
  AND "unmarkedDays" IN ('present', 'absent')
  AND "workdayHours" > 0 AND "lateGraceMinutes" >= 0
  AND "overtimeRate" >= 1 AND "overtimeNightRate" >= 1 AND "overtimeRestDayRate" >= 1 AND "overtimeHolidayRate" >= 1);
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_values_check" CHECK (
  "payPercent" BETWEEN 0 AND 100 AND "accrual" IN ('annual', 'monthly', 'none')
  AND "eligibleAfterMonths" >= 0 AND "maxCarryOverDays" >= 0 AND "daysAllowedPerYear" >= 0);
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_dayPortion_check" CHECK ("dayPortion" IN ('full', 'half_am', 'half_pm', 'hours') AND "days" >= 0);
ALTER TABLE "ShiftType" ADD CONSTRAINT "ShiftType_allowance_check" CHECK ("allowanceMode" IN ('fixed', 'percent') AND "allowanceValue" >= 0);
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_minutes_check" CHECK (
  "status" IN ('present', 'absent', 'half_day', 'on_leave', 'holiday')
  AND "lateMinutes" >= 0 AND "overtimeMinutes" >= 0 AND "overtimeNightMinutes" >= 0
  AND "overtimeRestDayMinutes" >= 0 AND "overtimeHolidayMinutes" >= 0);
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_variable_pay_check" CHECK (
  "overtimePay" >= 0 AND "shiftAllowance" >= 0 AND "commission" >= 0
  AND "absenceDeduction" >= 0 AND "leaveDeduction" >= 0 AND "latenessDeduction" >= 0);

-- Default rules: salary paid on the 1st for the previous month, Friday/Saturday weekend, 8-hour day.
INSERT INTO "HrPolicy" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;

-- Leave types: pay follows isPaid; sick leave pays 15 days full, 20 days half, 20 days unpaid (Bahrain Labour Law art. 65).
UPDATE "LeaveType" SET "payPercent" = CASE WHEN "isPaid" THEN 100 ELSE 0 END;
UPDATE "LeaveType" SET "accrual" = 'monthly', "maxCarryOverDays" = 15, "sortOrder" = 1 WHERE "code" = 'annual';
UPDATE "LeaveType" SET "daysAllowedPerYear" = 55, "payTiers" = '[{"upToDays":15,"percent":100},{"upToDays":35,"percent":50},{"upToDays":55,"percent":0}]', "sortOrder" = 2 WHERE "code" = 'sick';
UPDATE "LeaveType" SET "sortOrder" = 3 WHERE "code" = 'emergency';
UPDATE "LeaveType" SET "allowHalfDay" = false, "countCalendarDays" = true, "eligibleAfterMonths" = 12, "sortOrder" = 5 WHERE "code" = 'hajj';
INSERT INTO "LeaveType" ("id", "code", "nameEn", "nameAr", "daysAllowedPerYear", "isPaid", "payPercent", "accrual", "allowHalfDay", "allowHours", "sortOrder")
VALUES (gen_random_uuid()::text, 'unpaid', 'Unpaid Leave', 'إجازة بدون راتب', 0, false, 0, 'none', true, true, 6)
ON CONFLICT ("code") DO NOTHING;
INSERT INTO "LeaveType" ("id", "code", "nameEn", "nameAr", "daysAllowedPerYear", "isPaid", "payPercent", "accrual", "allowHalfDay", "countCalendarDays", "payTiers", "sortOrder")
VALUES (gen_random_uuid()::text, 'maternity', 'Maternity Leave', 'إجازة أمومة', 75, true, 100, 'annual', false, true, '[{"upToDays":60,"percent":100},{"upToDays":75,"percent":0}]', 4)
ON CONFLICT ("code") DO NOTHING;

-- Existing requests: hour-based when not full day, and the working days they charge (Friday/Saturday off).
UPDATE "LeaveRequest" SET "dayPortion" = 'hours' WHERE "fullDay" = false;
UPDATE "LeaveRequest" lr SET "days" = CASE
  WHEN lr."fullDay" = false THEN LEAST(1, COALESCE(lr."hours", 0) / 8)
  ELSE (SELECT COUNT(*) FROM generate_series(lr."startDate"::date, lr."endDate"::date, interval '1 day') d WHERE EXTRACT(DOW FROM d) NOT IN (5, 6))
END;
