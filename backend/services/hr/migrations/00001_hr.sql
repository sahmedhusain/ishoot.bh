-- +goose Up
CREATE TABLE IF NOT EXISTS hr.department (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    code text NOT NULL UNIQUE,
    head_id text,
    parent_id text REFERENCES hr.department(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS hr.employee (
    id text PRIMARY KEY,
    employee_number text NOT NULL UNIQUE,
    first_name_en text NOT NULL,
    last_name_en text NOT NULL,
    first_name_ar text NOT NULL,
    last_name_ar text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    job_title_en text NOT NULL,
    job_title_ar text NOT NULL,
    department_id text REFERENCES hr.department(id) ON DELETE SET NULL,
    hire_date date NOT NULL DEFAULT current_date,
    status text NOT NULL DEFAULT 'active',
    basic_salary numeric(14, 3) NOT NULL DEFAULT 0.000,
    housing_allowance numeric(14, 3) NOT NULL DEFAULT 0.000,
    transport_allowance numeric(14, 3) NOT NULL DEFAULT 0.000,
    other_allowances numeric(14, 3) NOT NULL DEFAULT 0.000,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employee_dept_status_idx ON hr.employee (department_id, status);
CREATE TABLE IF NOT EXISTS hr.leave_request (
    id text PRIMARY KEY,
    employee_id text NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_count numeric(5, 1) NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    reason text,
    approved_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leave_emp_status_idx ON hr.leave_request (employee_id, status);
CREATE TABLE IF NOT EXISTS hr.attendance_entry (
    id text PRIMARY KEY,
    employee_id text NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE,
    entry_date date NOT NULL DEFAULT current_date,
    check_in timestamptz,
    check_out timestamptz,
    status text NOT NULL DEFAULT 'present',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_emp_date_idx ON hr.attendance_entry (employee_id, entry_date);
CREATE TABLE IF NOT EXISTS hr.payroll_run (
    id text PRIMARY KEY,
    period_month integer NOT NULL,
    period_year integer NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    total_gross numeric(14, 3) NOT NULL DEFAULT 0.000,
    total_deductions numeric(14, 3) NOT NULL DEFAULT 0.000,
    total_net numeric(14, 3) NOT NULL DEFAULT 0.000,
    currency text NOT NULL DEFAULT '',
    processed_at timestamptz,
    approved_by text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payroll_period_idx ON hr.payroll_run (period_year, period_month);
CREATE TABLE IF NOT EXISTS hr.payroll_item (
    id text PRIMARY KEY,
    payroll_run_id text NOT NULL REFERENCES hr.payroll_run(id) ON DELETE CASCADE,
    employee_id text NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE,
    basic_salary numeric(14, 3) NOT NULL,
    allowances numeric(14, 3) NOT NULL DEFAULT 0.000,
    deductions numeric(14, 3) NOT NULL DEFAULT 0.000,
    net_salary numeric(14, 3) NOT NULL,
    status text NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS payroll_item_run_idx ON hr.payroll_item (payroll_run_id);

-- +goose Down
DROP TABLE IF EXISTS hr.payroll_item;
DROP TABLE IF EXISTS hr.payroll_run;
DROP TABLE IF EXISTS hr.attendance_entry;
DROP TABLE IF EXISTS hr.leave_request;
DROP TABLE IF EXISTS hr.employee;
DROP TABLE IF EXISTS hr.department;
