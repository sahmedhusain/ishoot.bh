package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
)

type EmployeeCredential struct {
	ID             string     `json:"id"`
	EmployeeID     string     `json:"employeeId"`
	Kind           string     `json:"kind"`
	VisaType       *string    `json:"visaType,omitempty"`
	Label          string     `json:"label"`
	Number         *string    `json:"number,omitempty"`
	IssuingCountry *string    `json:"issuingCountry,omitempty"`
	IssueDate      *time.Time `json:"issueDate,omitempty"`
	ExpiryDate     *time.Time `json:"expiryDate,omitempty"`
	Sponsor        *string    `json:"sponsor,omitempty"`
	CostAmount     *float64   `json:"costAmount,omitempty"`
	CostCurrency   *string    `json:"costCurrency,omitempty"`
	CostFrequency  *string    `json:"costFrequency,omitempty"`
	CostTermMonths *int32     `json:"costTermMonths,omitempty"`
	PaidBy         *string    `json:"paidBy,omitempty"`
	FileURL        *string    `json:"fileUrl,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type EmployeeHandover struct {
	ID             string     `json:"id"`
	Reference      string     `json:"reference"`
	EmployeeID     string     `json:"employeeId"`
	EmployeeName   string     `json:"employeeName,omitempty"`
	Kind           string     `json:"kind"`
	LeaveRequestID *string    `json:"leaveRequestId,omitempty"`
	EffectiveDate  *time.Time `json:"effectiveDate,omitempty"`
	ReturnDate     *time.Time `json:"returnDate,omitempty"`
	Reason         *string    `json:"reason,omitempty"`
	Status         string     `json:"status"`
	CasesMode      *string    `json:"casesMode,omitempty"`
	DelegateUserID *string    `json:"delegateUserId,omitempty"`
	DelegateName   string     `json:"delegateName,omitempty"`
}

type EmployeeRecurringPay struct {
	ID         string    `json:"id"`
	EmployeeID string    `json:"employeeId"`
	Kind       string    `json:"kind"`
	Category   string    `json:"category"`
	Label      string    `json:"label"`
	Amount     float64   `json:"amount"`
	StartMonth *string   `json:"startMonth,omitempty"`
	EndMonth   *string   `json:"endMonth,omitempty"`
	IsActive   bool      `json:"isActive"`
	Note       *string   `json:"note,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type LeaveBalance struct {
	ID            string    `json:"id"`
	EmployeeID    string    `json:"employeeId"`
	LeaveTypeID   *string   `json:"leaveTypeId,omitempty"`
	LeaveType     string    `json:"leaveType"`
	Year          int32     `json:"year"`
	EntitledDays  float64   `json:"entitledDays"`
	UsedDays      float64   `json:"usedDays"`
	RemainingDays float64   `json:"remainingDays"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type EmployeePayItem struct {
	ID            string     `json:"id"`
	PayrollRunID  string     `json:"payrollRunId"`
	EmployeeID    string     `json:"employeeId"`
	PeriodMonth   int32      `json:"periodMonth"`
	PeriodYear    int32      `json:"periodYear"`
	RunStatus     string     `json:"runStatus"`
	Currency      string     `json:"currency"`
	BasicSalary   string     `json:"basicSalary"`
	Allowances    string     `json:"allowances"`
	Deductions    string     `json:"deductions"`
	NetSalary     string     `json:"netSalary"`
	Status        string     `json:"status"`
	PaymentStatus *string    `json:"paymentStatus,omitempty"`
	PaidAt        *time.Time `json:"paidAt,omitempty"`
}

type IdentityUserRef struct {
	SubjectID   string    `json:"subjectId"`
	Realm       string    `json:"realm"`
	DisplayName string    `json:"displayName"`
	Email       string    `json:"email"`
	Status      string    `json:"status"`
	EmployeeID  *string   `json:"employeeId,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type EmployeeLinksPatch struct {
	UserID       *string
	ManagerID    *string
	DepartmentID *string
	Status       *string
	JobTitleEn   *string
	JobTitleAr   *string
	Phone        *string
}

type EmployeeLinkInfo struct {
	EmployeeID string  `json:"employeeId"`
	UserID     *string `json:"userId,omitempty"`
	ManagerID  *string `json:"managerId,omitempty"`
}

func (s *Store) UpdateEmployeeLinks(ctx context.Context, id string, patch EmployeeLinksPatch) (EmployeeLinkInfo, error) {
	if s.pool == nil {
		return EmployeeLinkInfo{}, errors.New("hr store has no pool")
	}
	sets := []string{"updated_at = now()"}
	args := []any{id}
	idx := 2
	if patch.UserID != nil {
		sets = append(sets, fmt.Sprintf("user_id = NULLIF($%d, '')", idx))
		args = append(args, *patch.UserID)
		idx++
	}
	if patch.ManagerID != nil {
		sets = append(sets, fmt.Sprintf("manager_id = NULLIF($%d, '')", idx))
		args = append(args, *patch.ManagerID)
		idx++
	}
	if patch.DepartmentID != nil {
		sets = append(sets, fmt.Sprintf("department_id = NULLIF($%d, '')", idx))
		args = append(args, *patch.DepartmentID)
		idx++
	}
	if patch.Status != nil && *patch.Status != "" {
		sets = append(sets, fmt.Sprintf("status = $%d", idx))
		args = append(args, *patch.Status)
		idx++
	}
	if patch.JobTitleEn != nil && *patch.JobTitleEn != "" {
		sets = append(sets, fmt.Sprintf("job_title_en = $%d", idx))
		args = append(args, *patch.JobTitleEn)
		idx++
	}
	if patch.JobTitleAr != nil && *patch.JobTitleAr != "" {
		sets = append(sets, fmt.Sprintf("job_title_ar = $%d", idx))
		args = append(args, *patch.JobTitleAr)
		idx++
	}
	if patch.Phone != nil {
		sets = append(sets, fmt.Sprintf("phone = NULLIF($%d, '')", idx))
		args = append(args, *patch.Phone)
		idx++
	}
	var info EmployeeLinkInfo
	query := `UPDATE hr.employee SET ` + strings.Join(sets, ", ") + ` WHERE id = $1 RETURNING id, user_id, manager_id`
	err := s.pool.QueryRow(ctx, query, args...).Scan(&info.EmployeeID, &info.UserID, &info.ManagerID)
	if err != nil {
		return EmployeeLinkInfo{}, err
	}
	if info.UserID != nil && *info.UserID != "" {
		_, _ = s.pool.Exec(ctx, `UPDATE hr.identity_user_ref SET employee_id = $2, updated_at = now() WHERE subject_id = $1`, *info.UserID, id)
	}
	return info, nil
}

func (s *Store) GetEmployeeLinks(ctx context.Context, id string) (EmployeeLinkInfo, error) {
	if s.pool == nil {
		return EmployeeLinkInfo{}, nil
	}
	var info EmployeeLinkInfo
	err := s.pool.QueryRow(ctx, `SELECT id, user_id, manager_id FROM hr.employee WHERE id = $1`, id).
		Scan(&info.EmployeeID, &info.UserID, &info.ManagerID)
	return info, err
}

func (s *Store) ListCredentials(ctx context.Context, employeeID string) ([]EmployeeCredential, error) {
	q := `SELECT id, COALESCE(employee_id,''), COALESCE(kind,'other'), visa_type, COALESCE(label,''), number, issuing_country,
	             issue_date, expiry_date, sponsor, cost_amount::float8, cost_currency, cost_frequency, cost_term_months,
	             paid_by, file_url, notes, created_at, updated_at
	      FROM hr.employee_credential`
	var args []any
	if employeeID != "" {
		q += ` WHERE employee_id = $1`
		args = append(args, employeeID)
	}
	q += ` ORDER BY expiry_date ASC NULLS LAST, created_at DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]EmployeeCredential, 0)
	for rows.Next() {
		var c EmployeeCredential
		if err := rows.Scan(
			&c.ID, &c.EmployeeID, &c.Kind, &c.VisaType, &c.Label, &c.Number, &c.IssuingCountry,
			&c.IssueDate, &c.ExpiryDate, &c.Sponsor, &c.CostAmount, &c.CostCurrency, &c.CostFrequency,
			&c.CostTermMonths, &c.PaidBy, &c.FileURL, &c.Notes, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) UpsertCredential(ctx context.Context, in EmployeeCredential) (EmployeeCredential, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.Kind == "" {
		in.Kind = "other"
	}
	var out EmployeeCredential
	err := s.pool.QueryRow(ctx, `
		INSERT INTO hr.employee_credential (
			id, employee_id, kind, visa_type, label, number, issuing_country,
			issue_date, expiry_date, sponsor, cost_amount, cost_currency, cost_frequency,
			cost_term_months, paid_by, file_url, notes, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now(),now())
		ON CONFLICT (id) DO UPDATE SET
			kind = EXCLUDED.kind,
			visa_type = EXCLUDED.visa_type,
			label = EXCLUDED.label,
			number = EXCLUDED.number,
			issuing_country = EXCLUDED.issuing_country,
			issue_date = EXCLUDED.issue_date,
			expiry_date = EXCLUDED.expiry_date,
			sponsor = EXCLUDED.sponsor,
			cost_amount = EXCLUDED.cost_amount,
			cost_currency = EXCLUDED.cost_currency,
			cost_frequency = EXCLUDED.cost_frequency,
			cost_term_months = EXCLUDED.cost_term_months,
			paid_by = EXCLUDED.paid_by,
			file_url = EXCLUDED.file_url,
			notes = EXCLUDED.notes,
			updated_at = now()
		RETURNING id, COALESCE(employee_id,''), COALESCE(kind,'other'), visa_type, COALESCE(label,''), number, issuing_country,
		          issue_date, expiry_date, sponsor, cost_amount::float8, cost_currency, cost_frequency, cost_term_months,
		          paid_by, file_url, notes, created_at, updated_at`,
		in.ID, in.EmployeeID, in.Kind, in.VisaType, in.Label, in.Number, in.IssuingCountry,
		in.IssueDate, in.ExpiryDate, in.Sponsor, in.CostAmount, in.CostCurrency, in.CostFrequency,
		in.CostTermMonths, in.PaidBy, in.FileURL, in.Notes,
	).Scan(
		&out.ID, &out.EmployeeID, &out.Kind, &out.VisaType, &out.Label, &out.Number, &out.IssuingCountry,
		&out.IssueDate, &out.ExpiryDate, &out.Sponsor, &out.CostAmount, &out.CostCurrency, &out.CostFrequency,
		&out.CostTermMonths, &out.PaidBy, &out.FileURL, &out.Notes, &out.CreatedAt, &out.UpdatedAt,
	)
	return out, err
}

func (s *Store) DeleteCredential(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM hr.employee_credential WHERE id = $1`, id)
	return err
}

func (s *Store) ListHandovers(ctx context.Context, employeeID, delegateUserID string) ([]EmployeeHandover, error) {
	q := `SELECT h.id, COALESCE(h.reference,''), COALESCE(h.employee_id,''),
	             TRIM(COALESCE(e.first_name_en,'') || ' ' || COALESCE(e.last_name_en,'')) AS emp_name,
	             COALESCE(h.kind,'leave'), h.leave_request_id, h.effective_date, h.return_date, h.reason,
	             COALESCE(h.status,'pending'), h.cases_mode, h.delegate_user_id,
	             COALESCE(NULLIF(TRIM(COALESCE(de.first_name_en,'') || ' ' || COALESCE(de.last_name_en,'')), ''), COALESCE(u.display_name, '')) AS del_name
	      FROM hr.employee_handover h
	      LEFT JOIN hr.employee e ON e.id = h.employee_id
	      LEFT JOIN hr.employee de ON (de.id = h.delegate_user_id OR de.user_id = h.delegate_user_id)
	      LEFT JOIN hr.identity_user_ref u ON u.subject_id = h.delegate_user_id
	      WHERE 1=1`
	var args []any
	idx := 1
	if employeeID != "" {
		q += fmt.Sprintf(" AND h.employee_id = $%d", idx)
		args = append(args, employeeID)
		idx++
	}
	if delegateUserID != "" {
		q += fmt.Sprintf(" AND h.delegate_user_id = $%d", idx)
		args = append(args, delegateUserID)
		idx++
	}
	q += ` ORDER BY h.effective_date DESC NULLS LAST, h.id DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]EmployeeHandover, 0)
	for rows.Next() {
		var h EmployeeHandover
		if err := rows.Scan(
			&h.ID, &h.Reference, &h.EmployeeID, &h.EmployeeName, &h.Kind, &h.LeaveRequestID,
			&h.EffectiveDate, &h.ReturnDate, &h.Reason, &h.Status, &h.CasesMode, &h.DelegateUserID, &h.DelegateName,
		); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (s *Store) UpsertHandover(ctx context.Context, in EmployeeHandover) (EmployeeHandover, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.Reference == "" {
		in.Reference = "HO-" + strings.ToUpper(in.ID[:8])
	}
	if in.Kind == "" {
		in.Kind = "leave"
	}
	if in.Status == "" {
		in.Status = "active"
	}
	var out EmployeeHandover
	err := s.pool.QueryRow(ctx, `
		INSERT INTO hr.employee_handover (
			id, reference, employee_id, kind, leave_request_id, effective_date,
			return_date, reason, status, cases_mode, delegate_user_id
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (id) DO UPDATE SET
			kind = EXCLUDED.kind,
			leave_request_id = EXCLUDED.leave_request_id,
			effective_date = EXCLUDED.effective_date,
			return_date = EXCLUDED.return_date,
			reason = EXCLUDED.reason,
			status = EXCLUDED.status,
			cases_mode = EXCLUDED.cases_mode,
			delegate_user_id = EXCLUDED.delegate_user_id
		RETURNING id, COALESCE(reference,''), COALESCE(employee_id,''), COALESCE(kind,'leave'),
		          leave_request_id, effective_date, return_date, reason, COALESCE(status,'pending'),
		          cases_mode, delegate_user_id`,
		in.ID, in.Reference, in.EmployeeID, in.Kind, in.LeaveRequestID, in.EffectiveDate,
		in.ReturnDate, in.Reason, in.Status, in.CasesMode, in.DelegateUserID,
	).Scan(
		&out.ID, &out.Reference, &out.EmployeeID, &out.Kind, &out.LeaveRequestID,
		&out.EffectiveDate, &out.ReturnDate, &out.Reason, &out.Status, &out.CasesMode, &out.DelegateUserID,
	)
	return out, err
}

func (s *Store) ListRecurringPay(ctx context.Context, employeeID string) ([]EmployeeRecurringPay, error) {
	q := `SELECT id, COALESCE(employee_id,''), COALESCE(kind,'allowance'), COALESCE(category,'other'),
	             COALESCE(label,''), COALESCE(amount::float8, 0), start_month, end_month,
	             COALESCE(is_active, true), note, created_at, updated_at
	      FROM hr.employee_recurring_pay`
	var args []any
	if employeeID != "" {
		q += ` WHERE employee_id = $1`
		args = append(args, employeeID)
	}
	q += ` ORDER BY is_active DESC, created_at DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]EmployeeRecurringPay, 0)
	for rows.Next() {
		var r EmployeeRecurringPay
		if err := rows.Scan(
			&r.ID, &r.EmployeeID, &r.Kind, &r.Category, &r.Label, &r.Amount,
			&r.StartMonth, &r.EndMonth, &r.IsActive, &r.Note, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) UpsertRecurringPay(ctx context.Context, in EmployeeRecurringPay) (EmployeeRecurringPay, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.Kind == "" {
		in.Kind = "allowance"
	}
	if in.Category == "" {
		in.Category = "other"
	}
	var out EmployeeRecurringPay
	err := s.pool.QueryRow(ctx, `
		INSERT INTO hr.employee_recurring_pay (
			id, employee_id, kind, category, label, amount, start_month, end_month, is_active, note, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
		ON CONFLICT (id) DO UPDATE SET
			kind = EXCLUDED.kind,
			category = EXCLUDED.category,
			label = EXCLUDED.label,
			amount = EXCLUDED.amount,
			start_month = EXCLUDED.start_month,
			end_month = EXCLUDED.end_month,
			is_active = EXCLUDED.is_active,
			note = EXCLUDED.note,
			updated_at = now()
		RETURNING id, COALESCE(employee_id,''), COALESCE(kind,'allowance'), COALESCE(category,'other'),
		          COALESCE(label,''), COALESCE(amount::float8, 0), start_month, end_month,
		          COALESCE(is_active, true), note, created_at, updated_at`,
		in.ID, in.EmployeeID, in.Kind, in.Category, in.Label, in.Amount,
		in.StartMonth, in.EndMonth, in.IsActive, in.Note,
	).Scan(
		&out.ID, &out.EmployeeID, &out.Kind, &out.Category, &out.Label, &out.Amount,
		&out.StartMonth, &out.EndMonth, &out.IsActive, &out.Note, &out.CreatedAt, &out.UpdatedAt,
	)
	return out, err
}

func (s *Store) DeleteRecurringPay(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM hr.employee_recurring_pay WHERE id = $1`, id)
	return err
}

func (s *Store) ListLeaveBalances(ctx context.Context, employeeID string, year int32) ([]LeaveBalance, error) {
	q := `SELECT id, employee_id, leave_type_id, leave_type, year, entitled_days::float8, used_days::float8, remaining_days::float8, updated_at
	      FROM hr.leave_balance WHERE 1=1`
	var args []any
	idx := 1
	if employeeID != "" {
		q += fmt.Sprintf(" AND employee_id = $%d", idx)
		args = append(args, employeeID)
		idx++
	}
	if year > 0 {
		q += fmt.Sprintf(" AND year = $%d", idx)
		args = append(args, year)
		idx++
	}
	q += ` ORDER BY year DESC, leave_type ASC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]LeaveBalance, 0)
	for rows.Next() {
		var b LeaveBalance
		if err := rows.Scan(&b.ID, &b.EmployeeID, &b.LeaveTypeID, &b.LeaveType, &b.Year, &b.EntitledDays, &b.UsedDays, &b.RemainingDays, &b.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *Store) UpsertLeaveBalance(ctx context.Context, in LeaveBalance) (LeaveBalance, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.LeaveType == "" {
		in.LeaveType = "annual"
	}
	if in.Year == 0 {
		in.Year = int32(time.Now().UTC().Year())
	}
	if in.RemainingDays == 0 && in.EntitledDays > 0 {
		in.RemainingDays = in.EntitledDays - in.UsedDays
	}
	var out LeaveBalance
	err := s.pool.QueryRow(ctx, `
		INSERT INTO hr.leave_balance (id, employee_id, leave_type_id, leave_type, year, entitled_days, used_days, remaining_days, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
		ON CONFLICT (employee_id, leave_type, year) DO UPDATE SET
			leave_type_id = COALESCE(EXCLUDED.leave_type_id, hr.leave_balance.leave_type_id),
			entitled_days = EXCLUDED.entitled_days,
			used_days = EXCLUDED.used_days,
			remaining_days = EXCLUDED.remaining_days,
			updated_at = now()
		RETURNING id, employee_id, leave_type_id, leave_type, year, entitled_days::float8, used_days::float8, remaining_days::float8, updated_at`,
		in.ID, in.EmployeeID, in.LeaveTypeID, in.LeaveType, in.Year, in.EntitledDays, in.UsedDays, in.RemainingDays,
	).Scan(&out.ID, &out.EmployeeID, &out.LeaveTypeID, &out.LeaveType, &out.Year, &out.EntitledDays, &out.UsedDays, &out.RemainingDays, &out.UpdatedAt)
	return out, err
}

func (s *Store) ListEmployeePayItems(ctx context.Context, employeeID string) ([]EmployeePayItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT pi.id, pi.payroll_run_id, pi.employee_id, pr.period_month, pr.period_year,
		       pr.status, pr.currency, pi.basic_salary::text, pi.allowances::text, pi.deductions::text,
		       pi.net_salary::text, pi.status, pi.payment_status, pi.paid_at
		FROM hr.payroll_item pi
		JOIN hr.payroll_run pr ON pr.id = pi.payroll_run_id
		WHERE pi.employee_id = $1
		ORDER BY pr.period_year DESC, pr.period_month DESC`, employeeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]EmployeePayItem, 0)
	for rows.Next() {
		var p EmployeePayItem
		if err := rows.Scan(
			&p.ID, &p.PayrollRunID, &p.EmployeeID, &p.PeriodMonth, &p.PeriodYear,
			&p.RunStatus, &p.Currency, &p.BasicSalary, &p.Allowances, &p.Deductions,
			&p.NetSalary, &p.Status, &p.PaymentStatus, &p.PaidAt,
		); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) ListIdentityUserRefs(ctx context.Context, realm string) ([]IdentityUserRef, error) {
	q := `SELECT subject_id, realm, display_name, email, status, employee_id, updated_at FROM hr.identity_user_ref`
	var args []any
	if realm != "" {
		q += ` WHERE realm = $1`
		args = append(args, realm)
	}
	q += ` ORDER BY updated_at DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]IdentityUserRef, 0)
	for rows.Next() {
		var u IdentityUserRef
		if err := rows.Scan(&u.SubjectID, &u.Realm, &u.DisplayName, &u.Email, &u.Status, &u.EmployeeID, &u.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *Store) SyncIdentityUserEvent(ctx context.Context, consumer, eventID, subject, subjectID, realm, displayName, email string) error {
	if s.pool == nil || subjectID == "" {
		return nil
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, Schema, consumer, eventID)
		if err != nil || !first {
			return err
		}
		if subject == "identity.user.deleted" {
			_, err = tx.Exec(ctx, `UPDATE hr.identity_user_ref SET status = 'deleted', updated_at = now() WHERE subject_id = $1`, subjectID)
			if err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `UPDATE hr.employee SET user_id = NULL, updated_at = now() WHERE user_id = $1`, subjectID)
			return err
		}
		var empID *string
		if email != "" {
			var found string
			if err := tx.QueryRow(ctx, `SELECT id FROM hr.employee WHERE LOWER(email) = LOWER($1) OR user_id = $2 LIMIT 1`, email, subjectID).Scan(&found); err == nil {
				empID = &found
			}
		} else {
			var found string
			if err := tx.QueryRow(ctx, `SELECT id FROM hr.employee WHERE user_id = $1 LIMIT 1`, subjectID).Scan(&found); err == nil {
				empID = &found
			}
		}
		if empID != nil {
			if _, err := tx.Exec(ctx, `UPDATE hr.employee SET user_id = $2, updated_at = now() WHERE id = $1 AND (user_id IS NULL OR user_id = '')`, *empID, subjectID); err != nil {
				return err
			}
		}
		if realm == "" {
			realm = "staff"
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO hr.identity_user_ref (subject_id, realm, display_name, email, status, employee_id, updated_at)
			VALUES ($1, $2, $3, $4, 'active', $5, now())
			ON CONFLICT (subject_id) DO UPDATE SET
				realm = EXCLUDED.realm,
				display_name = CASE WHEN EXCLUDED.display_name <> '' THEN EXCLUDED.display_name ELSE hr.identity_user_ref.display_name END,
				email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE hr.identity_user_ref.email END,
				status = 'active',
				employee_id = COALESCE(EXCLUDED.employee_id, hr.identity_user_ref.employee_id),
				updated_at = now()`,
			subjectID, realm, displayName, email, empID,
		)
		return err
	})
}
