// Package postgres stores hr entities in the hr schema.
package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/hr/internal/postgres/sqlcdb"
)

const Schema = "hr"

type Department = sqlcdb.HrDepartment
type Employee = sqlcdb.HrEmployee
type LeaveRequest = sqlcdb.HrLeaveRequest
type AttendanceEntry = sqlcdb.HrAttendanceEntry
type PayrollRun = sqlcdb.HrPayrollRun
type PayrollItem = sqlcdb.HrPayrollItem

type Store struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, q: sqlcdb.New(pool)} }

func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}

// Departments
func (s *Store) ListDepartments(ctx context.Context) ([]Department, error) {
	return s.q.ListDepartments(ctx)
}
func (s *Store) GetDepartmentByID(ctx context.Context, id string) (Department, error) {
	return s.q.GetDepartmentByID(ctx, id)
}
func (s *Store) CreateDepartment(ctx context.Context, p sqlcdb.CreateDepartmentParams) (Department, error) {
	return s.q.CreateDepartment(ctx, p)
}
func (s *Store) UpdateDepartment(ctx context.Context, p sqlcdb.UpdateDepartmentParams) (Department, error) {
	return s.q.UpdateDepartment(ctx, p)
}
func (s *Store) DeleteDepartment(ctx context.Context, id string) error {
	return s.q.DeleteDepartment(ctx, id)
}

// Employees
func (s *Store) ListEmployees(ctx context.Context) ([]Employee, error) {
	return s.q.ListEmployees(ctx)
}
func (s *Store) GetEmployeeByID(ctx context.Context, id string) (Employee, error) {
	return s.q.GetEmployeeByID(ctx, id)
}
func (s *Store) GetEmployeeByEmail(ctx context.Context, email string) (Employee, error) {
	return s.q.GetEmployeeByEmail(ctx, email)
}
func (s *Store) CreateEmployee(ctx context.Context, p sqlcdb.CreateEmployeeParams) (Employee, error) {
	return s.q.CreateEmployee(ctx, p)
}
func (s *Store) UpdateEmployee(ctx context.Context, p sqlcdb.UpdateEmployeeParams) (Employee, error) {
	return s.q.UpdateEmployee(ctx, p)
}
func (s *Store) UpdateEmployeeStatus(ctx context.Context, p sqlcdb.UpdateEmployeeStatusParams) (Employee, error) {
	return s.q.UpdateEmployeeStatus(ctx, p)
}
func (s *Store) DeleteEmployee(ctx context.Context, id string) error {
	return s.q.DeleteEmployee(ctx, id)
}

// Leave Requests
func (s *Store) ListLeaveRequests(ctx context.Context) ([]LeaveRequest, error) {
	return s.q.ListLeaveRequests(ctx)
}
func (s *Store) ListLeaveRequestsByEmployee(ctx context.Context, employeeID string) ([]LeaveRequest, error) {
	return s.q.ListLeaveRequestsByEmployee(ctx, employeeID)
}
func (s *Store) GetLeaveRequestByID(ctx context.Context, id string) (LeaveRequest, error) {
	return s.q.GetLeaveRequestByID(ctx, id)
}
func (s *Store) CreateLeaveRequest(ctx context.Context, p sqlcdb.CreateLeaveRequestParams) (LeaveRequest, error) {
	return s.q.CreateLeaveRequest(ctx, p)
}
func (s *Store) UpdateLeaveRequestStatus(ctx context.Context, p sqlcdb.UpdateLeaveRequestStatusParams) (LeaveRequest, error) {
	return s.q.UpdateLeaveRequestStatus(ctx, p)
}

// Attendance
func (s *Store) ListAttendanceByDate(ctx context.Context, date pgtype.Date) ([]AttendanceEntry, error) {
	return s.q.ListAttendanceByDate(ctx, date)
}
func (s *Store) ListAttendanceByEmployee(ctx context.Context, employeeID string) ([]AttendanceEntry, error) {
	return s.q.ListAttendanceByEmployee(ctx, employeeID)
}
func (s *Store) RecordAttendance(ctx context.Context, p sqlcdb.RecordAttendanceParams) (AttendanceEntry, error) {
	return s.q.RecordAttendance(ctx, p)
}

// Payroll
func (s *Store) ListPayrollRuns(ctx context.Context) ([]PayrollRun, error) {
	return s.q.ListPayrollRuns(ctx)
}
func (s *Store) GetPayrollRunByID(ctx context.Context, id string) (PayrollRun, error) {
	return s.q.GetPayrollRunByID(ctx, id)
}
func (s *Store) CreatePayrollRun(ctx context.Context, p sqlcdb.CreatePayrollRunParams) (PayrollRun, error) {
	return s.q.CreatePayrollRun(ctx, p)
}
func (s *Store) UpdatePayrollRunStatus(ctx context.Context, p sqlcdb.UpdatePayrollRunStatusParams) (PayrollRun, error) {
	return s.q.UpdatePayrollRunStatus(ctx, p)
}
func (s *Store) ListPayrollItems(ctx context.Context, runID string) ([]PayrollItem, error) {
	return s.q.ListPayrollItems(ctx, runID)
}
func (s *Store) InsertPayrollItem(ctx context.Context, p sqlcdb.InsertPayrollItemParams) (PayrollItem, error) {
	return s.q.InsertPayrollItem(ctx, p)
}
