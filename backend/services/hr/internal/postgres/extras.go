package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Store) Pool() *pgxpool.Pool { return s.pool }

type UpdateDepartmentInput struct {
	Code       *string `json:"code"`
	NameEn     *string `json:"nameEn"`
	NameAr     *string `json:"nameAr"`
	ParentID   *string `json:"parentId"`
	HeadID     *string `json:"headId"`
	ManagerID  *string `json:"managerId"`
	DeputyID   *string `json:"deputyId"`
	CostCentre *string `json:"costCentre"`
	IsActive   *bool   `json:"isActive"`
}

type UpdateEmployeeInput struct {
	EmployeeNumber     *string  `json:"employeeNumber"`
	FirstNameEn        *string  `json:"firstNameEn"`
	LastNameEn         *string  `json:"lastNameEn"`
	FirstNameAr        *string  `json:"firstNameAr"`
	LastNameAr         *string  `json:"lastNameAr"`
	Email              *string  `json:"email"`
	Phone              *string  `json:"phone"`
	JobTitleEn         *string  `json:"jobTitleEn"`
	JobTitleAr         *string  `json:"jobTitleAr"`
	DepartmentID       *string  `json:"departmentId"`
	ReportingTo        *string  `json:"reportingTo"`
	ManagerID          *string  `json:"managerId"`
	UserID             *string  `json:"userId"`
	Status             *string  `json:"status"`
	BasicSalary        *float64 `json:"basicSalary"`
	HousingAllowance   *float64 `json:"housingAllowance"`
	TransportAllowance *float64 `json:"transportAllowance"`
	OtherAllowances    *float64 `json:"otherAllowances"`
	Nationality        *string  `json:"nationality"`
	Gender             *string  `json:"gender"`
	CprNumber          *string  `json:"cprNumber"`
	PassportNumber     *string  `json:"passportNumber"`
	PassportCountry    *string  `json:"passportCountry"`
}

func (s *Store) UpdateDepartmentFields(ctx context.Context, id string, in UpdateDepartmentInput) (Department, error) {
	_, err := s.pool.Exec(ctx, `
		UPDATE hr.department
		SET code = COALESCE($2, code),
		    name_en = COALESCE($3, name_en),
		    name_ar = COALESCE($4, name_ar),
		    parent_id = COALESCE($5, parent_id),
		    head_id = COALESCE($6, head_id),
		    manager_id = COALESCE($7, manager_id),
		    deputy_id = COALESCE($8, deputy_id),
		    cost_centre = COALESCE($9, cost_centre),
		    is_active = COALESCE($10, is_active),
		    updated_at = now()
		WHERE id = $1
	`, id, in.Code, in.NameEn, in.NameAr, in.ParentID, in.HeadID, in.ManagerID, in.DeputyID, in.CostCentre, in.IsActive)
	if err != nil {
		return Department{}, err
	}
	return s.GetDepartmentByID(ctx, id)
}

func (s *Store) DeleteDepartmentByID(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM hr.department WHERE id = $1`, id)
	return err
}

func (s *Store) AssignUsersToDepartment(ctx context.Context, userIDs []string, departmentID *string) error {
	if len(userIDs) == 0 {
		return nil
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE hr.employee
		SET department_id = $2, updated_at = now()
		WHERE user_id = ANY($1)
	`, userIDs, departmentID)
	return err
}

func (s *Store) UpdateEmployeeFields(ctx context.Context, id string, in UpdateEmployeeInput) (Employee, error) {
	_, err := s.pool.Exec(ctx, `
		UPDATE hr.employee
		SET employee_number = COALESCE($2, employee_number),
		    first_name_en = COALESCE($3, first_name_en),
		    last_name_en = COALESCE($4, last_name_en),
		    first_name_ar = COALESCE($5, first_name_ar),
		    last_name_ar = COALESCE($6, last_name_ar),
		    email = COALESCE($7, email),
		    phone = COALESCE($8, phone),
		    job_title_en = COALESCE($9, job_title_en),
		    job_title_ar = COALESCE($10, job_title_ar),
		    department_id = COALESCE($11, department_id),
		    reporting_to = COALESCE($12, reporting_to),
		    manager_id = COALESCE($13, manager_id),
		    user_id = COALESCE($14, user_id),
		    status = COALESCE($15, status),
		    basic_salary = COALESCE($16, basic_salary),
		    housing_allowance = COALESCE($17, housing_allowance),
		    transport_allowance = COALESCE($18, transport_allowance),
		    other_allowances = COALESCE($19, other_allowances),
		    nationality = COALESCE($20, nationality),
		    gender = COALESCE($21, gender),
		    cpr_number = COALESCE($22, cpr_number),
		    passport_number = COALESCE($23, passport_number),
		    passport_country = COALESCE($24, passport_country),
		    updated_at = now()
		WHERE id = $1
	`, id, in.EmployeeNumber, in.FirstNameEn, in.LastNameEn, in.FirstNameAr, in.LastNameAr,
		in.Email, in.Phone, in.JobTitleEn, in.JobTitleAr, in.DepartmentID, in.ReportingTo,
		in.ManagerID, in.UserID, in.Status, in.BasicSalary, in.HousingAllowance,
		in.TransportAllowance, in.OtherAllowances, in.Nationality, in.Gender,
		in.CprNumber, in.PassportNumber, in.PassportCountry)
	if err != nil {
		return Employee{}, err
	}
	return s.GetEmployeeByID(ctx, id)
}

func (s *Store) ListLeaveTypes(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t ORDER BY name_en ASC, code ASC), '[]'::json)
		FROM hr.leave_type t
	`)
}

func (s *Store) ListShiftTypes(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t ORDER BY name_en ASC), '[]'::json)
		FROM hr.shift_type t
	`)
}

func (s *Store) ListGosiComponents(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t ORDER BY code ASC, name_en ASC), '[]'::json)
		FROM hr.gosi_component t
	`)
}

func (s *Store) ListEmployeeGosiRecords(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t ORDER BY id ASC), '[]'::json)
		FROM hr.employee_gosi_record t
	`)
}

func (s *Store) GetGosiSettings(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t), '[]'::json)
		FROM hr.gosi_settings t
	`)
}

func (s *Store) ListSalaryDocuments(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t ORDER BY created_at DESC), '[]'::json)
		FROM hr.salary_document t
	`)
}

func (s *Store) ListEmployeeSupports(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t ORDER BY created_at DESC), '[]'::json)
		FROM hr.employee_support t
	`)
}

func (s *Store) ListAllPayrollItemsJSON(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t ORDER BY created_at DESC), '[]'::json)
		FROM hr.payroll_item t
	`)
}

func (s *Store) ListLeaveAdjustments(ctx context.Context) (json.RawMessage, error) {
	return s.queryJSONArray(ctx, `
		SELECT COALESCE(json_agg(t ORDER BY created_at DESC), '[]'::json)
		FROM hr.leave_adjustment t
	`)
}

func (s *Store) queryJSONArray(ctx context.Context, sql string) (json.RawMessage, error) {
	var raw []byte
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := s.pool.QueryRow(ctx, sql).Scan(&raw); err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return json.RawMessage(`[]`), nil
	}
	return json.RawMessage(raw), nil
}

func (s *Store) SaveShiftType(ctx context.Context, id, code, nameEn, nameAr, allowanceMode string, allowanceValue float64, isActive bool) (json.RawMessage, error) {
	var raw []byte
	err := s.pool.QueryRow(ctx, `
		INSERT INTO hr.shift_type (id, code, name_en, name_ar, allowance_mode, allowance_value, is_active)
		VALUES (COALESCE(NULLIF($1,''), gen_random_uuid()::text), $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, allowance_mode = EXCLUDED.allowance_mode, allowance_value = EXCLUDED.allowance_value, is_active = EXCLUDED.is_active
		RETURNING row_to_json(hr.shift_type.*)
	`, id, code, nameEn, nameAr, allowanceMode, allowanceValue, isActive).Scan(&raw)
	return json.RawMessage(raw), err
}

func (s *Store) SaveLeaveType(ctx context.Context, id, code, nameEn, nameAr string, daysAllowed float64, isPaid bool, payPercent int) (json.RawMessage, error) {
	var raw []byte
	err := s.pool.QueryRow(ctx, `
		INSERT INTO hr.leave_type (id, code, name_en, name_ar, days_allowed_per_year, is_paid, pay_percent)
		VALUES (COALESCE(NULLIF($1,''), gen_random_uuid()::text), $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, days_allowed_per_year = EXCLUDED.days_allowed_per_year, is_paid = EXCLUDED.is_paid, pay_percent = EXCLUDED.pay_percent
		RETURNING row_to_json(hr.leave_type.*)
	`, id, code, nameEn, nameAr, daysAllowed, isPaid, payPercent).Scan(&raw)
	return json.RawMessage(raw), err
}

func (s *Store) DeleteAttendanceByEmployeeDate(ctx context.Context, employeeID, date string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM hr.attendance_entry WHERE employee_id = $1 AND date = $2::date`, employeeID, date)
	return err
}
