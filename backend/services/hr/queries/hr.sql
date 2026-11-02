-- name: ListDepartments :many
SELECT * FROM hr.department ORDER BY name_en ASC;

-- name: GetDepartmentByID :one
SELECT * FROM hr.department WHERE id = $1 LIMIT 1;

-- name: CreateDepartment :one
INSERT INTO hr.department (
    id, name_en, name_ar, code, head_id, parent_id
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: UpdateDepartment :one
UPDATE hr.department SET
    name_en = $2,
    name_ar = $3,
    code = $4,
    head_id = $5,
    parent_id = $6
WHERE id = $1
RETURNING *;

-- name: DeleteDepartment :exec
DELETE FROM hr.department WHERE id = $1;

-- name: ListEmployees :many
SELECT * FROM hr.employee ORDER BY employee_number ASC;

-- name: GetEmployeeByID :one
SELECT * FROM hr.employee WHERE id = $1 LIMIT 1;

-- name: GetEmployeeByEmail :one
SELECT * FROM hr.employee WHERE email = $1 LIMIT 1;

-- name: CreateEmployee :one
INSERT INTO hr.employee (
    id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar,
    email, phone, job_title_en, job_title_ar, department_id, hire_date, status,
    basic_salary, housing_allowance, transport_allowance, other_allowances,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12, $13,
    $14, $15, $16, $17,
    now(), now()
) RETURNING *;

-- name: UpdateEmployee :one
UPDATE hr.employee SET
    first_name_en = $2,
    last_name_en = $3,
    first_name_ar = $4,
    last_name_ar = $5,
    email = $6,
    phone = $7,
    job_title_en = $8,
    job_title_ar = $9,
    department_id = $10,
    hire_date = $11,
    status = $12,
    basic_salary = $13,
    housing_allowance = $14,
    transport_allowance = $15,
    other_allowances = $16,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateEmployeeStatus :one
UPDATE hr.employee SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteEmployee :exec
DELETE FROM hr.employee WHERE id = $1;

-- name: ListLeaveRequests :many
SELECT * FROM hr.leave_request ORDER BY created_at DESC;

-- name: ListLeaveRequestsByEmployee :many
SELECT * FROM hr.leave_request WHERE employee_id = $1 ORDER BY start_date DESC;

-- name: GetLeaveRequestByID :one
SELECT * FROM hr.leave_request WHERE id = $1 LIMIT 1;

-- name: CreateLeaveRequest :one
INSERT INTO hr.leave_request (
    id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, now(), now()
) RETURNING *;

-- name: UpdateLeaveRequestStatus :one
UPDATE hr.leave_request SET
    status = $2,
    approved_by = $3,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListAttendanceByDate :many
SELECT * FROM hr.attendance_entry WHERE entry_date = $1 ORDER BY employee_id ASC;

-- name: ListAttendanceByEmployee :many
SELECT * FROM hr.attendance_entry WHERE employee_id = $1 ORDER BY entry_date DESC;

-- name: RecordAttendance :one
INSERT INTO hr.attendance_entry (
    id, employee_id, entry_date, check_in, check_out, status, notes, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) ON CONFLICT (employee_id, entry_date) DO UPDATE SET
    check_in = COALESCE(EXCLUDED.check_in, hr.attendance_entry.check_in),
    check_out = COALESCE(EXCLUDED.check_out, hr.attendance_entry.check_out),
    status = EXCLUDED.status,
    notes = EXCLUDED.notes
RETURNING *;

-- name: ListPayrollRuns :many
SELECT * FROM hr.payroll_run ORDER BY period_year DESC, period_month DESC;

-- name: GetPayrollRunByID :one
SELECT * FROM hr.payroll_run WHERE id = $1 LIMIT 1;

-- name: CreatePayrollRun :one
INSERT INTO hr.payroll_run (
    id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now()
) RETURNING *;

-- name: UpdatePayrollRunStatus :one
UPDATE hr.payroll_run SET
    status = $2,
    approved_by = $3,
    processed_at = CASE WHEN $2 = 'processed' THEN now() ELSE processed_at END
WHERE id = $1
RETURNING *;

-- name: ListPayrollItems :many
SELECT * FROM hr.payroll_item WHERE payroll_run_id = $1;

-- name: InsertPayrollItem :one
INSERT INTO hr.payroll_item (
    id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;
