-- +goose Up
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS catalogue_key TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS manager_id TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS deputy_id TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS cost_centre TEXT;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE hr.department ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS first_name_en TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS last_name_en TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS first_name_ar TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS last_name_ar TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS cpr_number TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS cpr_expiry_date TIMESTAMPTZ;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMPTZ;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS passport_country TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS passport_expiry_date TIMESTAMPTZ;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS job_title_en TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS job_title_ar TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS hire_date TIMESTAMPTZ;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS leave_balance_days DECIMAL;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS hr.leave_type (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
days_allowed_per_year DECIMAL,
is_paid BOOLEAN,
pay_percent INTEGER
);

CREATE TABLE IF NOT EXISTS hr.leave_adjustment (
id TEXT PRIMARY KEY,
employee_id TEXT,
leave_type_id TEXT,
year INTEGER,
days DECIMAL,
reason TEXT,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr.shift_type (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
allowance_mode TEXT,
allowance_value DECIMAL,
is_active BOOLEAN
);

ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS leave_type_id TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS full_day BOOLEAN;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS hours DECIMAL;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS day_portion TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS days DECIMAL;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS approved_by_id TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE hr.leave_request ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS check_in TIMESTAMPTZ;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS check_out TIMESTAMPTZ;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS late_minutes INTEGER;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS overtime_night_minutes INTEGER;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS overtime_rest_day_minutes INTEGER;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS overtime_holiday_minutes INTEGER;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS shift_type_id TEXT;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS recorded_by_id TEXT;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE hr.attendance_entry ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS hr.benefit_plan (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
coverage_details TEXT,
employer_contribution DECIMAL,
employee_contribution DECIMAL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS month INTEGER;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS attendance_start TIMESTAMPTZ;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS attendance_end TIMESTAMPTZ;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS pay_date TIMESTAMPTZ;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS total_gross DECIMAL;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS total_deductions DECIMAL;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS total_net DECIMAL;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS total_employer_cost DECIMAL;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS approved_by_id TEXT;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE hr.payroll_run ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS payroll_run_id TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS basic_salary DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS housing_allowance DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS transport_allowance DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS other_allowances DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS gross_salary DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS gosi_employee DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS gosi_employer DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS external_support DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS calculation_snapshot JSONB;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS other_deductions DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS bonus DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS overtime_pay DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS shift_allowance DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS commission DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS absence_deduction DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS leave_deduction DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS lateness_deduction DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS attendance_summary JSONB;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS adjustment_note TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS edited_by_id TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS net_salary DECIMAL;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS paid_by_id TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE hr.payroll_item ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS hr.salary_document (
id TEXT PRIMARY KEY,
employee_id TEXT,
kind TEXT,
months JSONB,
status TEXT,
requested_by_id TEXT,
reviewed_by_id TEXT,
review_notes TEXT,
snapshot JSONB,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
issued_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr.employee_credential (
id TEXT PRIMARY KEY,
employee_id TEXT,
kind TEXT,
visa_type TEXT,
label TEXT,
number TEXT,
issuing_country TEXT,
issue_date TIMESTAMPTZ,
expiry_date TIMESTAMPTZ,
sponsor TEXT,
cost_amount DECIMAL,
cost_currency TEXT,
cost_frequency TEXT,
cost_term_months INTEGER,
paid_by TEXT,
file_url TEXT,
notes TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr.payroll_item_line (
id TEXT PRIMARY KEY,
payroll_item_id TEXT,
kind TEXT,
category TEXT,
label TEXT,
amount DECIMAL,
note TEXT,
source TEXT,
recurring_id TEXT,
display_order INTEGER,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr.employee_recurring_pay (
id TEXT PRIMARY KEY,
employee_id TEXT,
kind TEXT,
category TEXT,
label TEXT,
amount DECIMAL,
start_month TEXT,
end_month TEXT,
is_active BOOLEAN,
note TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr.employee_handover (
id TEXT PRIMARY KEY,
reference TEXT UNIQUE,
employee_id TEXT,
kind TEXT,
leave_request_id TEXT UNIQUE,
effective_date TIMESTAMPTZ,
return_date TIMESTAMPTZ,
reason TEXT,
status TEXT,
cases_mode TEXT,
delegate_user_id TEXT
);

CREATE TABLE IF NOT EXISTS hr.employee_handover_case (
id TEXT PRIMARY KEY,
handover_id TEXT,
case_type TEXT,
case_id TEXT,
label TEXT,
to_user_id TEXT,
status TEXT,
reassigned_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr.gosi_settings (
nationality_categories JSONB
);

CREATE TABLE IF NOT EXISTS hr.gosi_component (
id TEXT PRIMARY KEY,
code TEXT,
name_en TEXT,
name_ar TEXT,
employee_percent DECIMAL,
employer_percent DECIMAL
);

CREATE TABLE IF NOT EXISTS hr.employee_gosi_record (
id TEXT PRIMARY KEY,
employee_id TEXT,
category TEXT,
registration_number TEXT,
registered_wage DECIMAL
);

CREATE TABLE IF NOT EXISTS hr.employee_support (
id TEXT PRIMARY KEY,
employee_id TEXT,
program_id TEXT,
status TEXT,
qualification TEXT,
application_ref TEXT,
applied_on TIMESTAMPTZ,
decided_on TIMESTAMPTZ,
start_month TEXT,
end_month TEXT,
approved_percent DECIMAL,
approved_amount DECIMAL,
monthly_cap DECIMAL,
notes TEXT,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr.employee_support_event (
id TEXT PRIMARY KEY,
support_id TEXT,
action TEXT,
details JSONB,
actor_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr.retail_shift (
id TEXT PRIMARY KEY,
branch_id TEXT,
shift_number TEXT UNIQUE,
opened_by_id TEXT,
closed_by_id TEXT,
opened_at TIMESTAMPTZ,
closed_at TIMESTAMPTZ,
status TEXT,
revision INTEGER
);

-- +goose Down