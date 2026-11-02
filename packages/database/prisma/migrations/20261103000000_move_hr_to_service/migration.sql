-- Migration: move hr entities to hr schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Department') THEN
        INSERT INTO hr.department (
            id, name_en, name_ar, code, head_id, parent_id
        )
        SELECT
            id, "nameEn", "nameAr", code, "headId", "parentId"
        FROM public."Department"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Employee') THEN
        INSERT INTO hr.employee (
            id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar,
            email, phone, job_title_en, job_title_ar, department_id, hire_date, status,
            basic_salary, housing_allowance, transport_allowance, other_allowances,
            created_at, updated_at
        )
        SELECT
            id, "employeeNumber", "firstNameEn", "lastNameEn", "firstNameAr", "lastNameAr",
            email, phone, "jobTitleEn", "jobTitleAr", "departmentId", "hireDate", status,
            "basicSalary", "housingAllowance", "transportAllowance", "otherAllowances",
            "createdAt", "updatedAt"
        FROM public."Employee"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'LeaveRequest') THEN
        INSERT INTO hr.leave_request (
            id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at
        )
        SELECT
            id, "employeeId", "leaveType", "startDate", "endDate", "daysCount", status, reason, "createdAt", "updatedAt"
        FROM public."LeaveRequest"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AttendanceEntry') THEN
        INSERT INTO hr.attendance_entry (
            id, employee_id, entry_date, check_in, check_out, status, notes, created_at
        )
        SELECT
            id, "employeeId", "entryDate", "checkIn", "checkOut", status, notes, "createdAt"
        FROM public."AttendanceEntry"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PayrollRun') THEN
        INSERT INTO hr.payroll_run (
            id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at
        )
        SELECT
            id, "periodMonth", "periodYear", status, "totalGross", "totalDeductions", "totalNet", currency, "processedAt", "approvedBy", "createdAt"
        FROM public."PayrollRun"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PayrollItem') THEN
        INSERT INTO hr.payroll_item (
            id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status
        )
        SELECT
            id, "payrollRunId", "employeeId", "basicSalary", allowances, deductions, "netSalary", status
        FROM public."PayrollItem"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
