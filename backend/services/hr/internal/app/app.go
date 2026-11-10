package app
import (
	"context"
	"errors"
	"time"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/hr/internal/postgres"
	"platform.local/backend/services/hr/internal/postgres/sqlcdb"
)
var (
	ErrNotFound	= errors.New("hr resource not found")
	ErrConflict	= errors.New("hr resource conflict")
)
const (
	EventEmployeeCreated		= "hr.employee.created"
	EventLeaveApproved		= "hr.leave.approved"
	EventPayrollProcessed		= "hr.payroll.processed"
	EventOffboardingComplete	= "hr.offboarding.completed"
)
type Service struct {
	store	*postgres.Store
	now	func() time.Time
}
func New(store *postgres.Store) *Service {
	return &Service{
		store:	store,
		now:	time.Now,
	}
}
func (s *Service) change(ctx context.Context, subject string, payload any, write func(*postgres.Store) error) error {
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		if err := write(st); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: subject, Payload: payload})
	})
}
func (s *Service) ListDepartments(ctx context.Context) ([]postgres.Department, error) {
	return s.store.ListDepartments(ctx)
}
func (s *Service) GetDepartment(ctx context.Context, id string) (postgres.Department, error) {
	d, err := s.store.GetDepartmentByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Department{}, ErrNotFound
		}
		return postgres.Department{}, err
	}
	return d, nil
}
func (s *Service) CreateDepartment(ctx context.Context, in sqlcdb.CreateDepartmentParams) (postgres.Department, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateDepartment(ctx, in)
}
func (s *Service) UpdateDepartment(ctx context.Context, in sqlcdb.UpdateDepartmentParams) (postgres.Department, error) {
	return s.store.UpdateDepartment(ctx, in)
}
func (s *Service) DeleteDepartment(ctx context.Context, id string) error {
	return s.store.DeleteDepartment(ctx, id)
}
func (s *Service) ListEmployees(ctx context.Context) ([]postgres.Employee, error) {
	return s.store.ListEmployees(ctx)
}
func (s *Service) GetEmployee(ctx context.Context, id string) (postgres.Employee, error) {
	e, err := s.store.GetEmployeeByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Employee{}, ErrNotFound
		}
		return postgres.Employee{}, err
	}
	return e, nil
}
func (s *Service) CreateEmployee(ctx context.Context, in sqlcdb.CreateEmployeeParams) (postgres.Employee, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.Employee
	err := s.change(ctx, EventEmployeeCreated, map[string]string{
		"employeeId":	in.ID,
		"email":	in.Email,
	}, func(st *postgres.Store) error {
		var txErr error
		created, txErr = st.CreateEmployee(ctx, in)
		return txErr
	})
	return created, err
}
func (s *Service) UpdateEmployee(ctx context.Context, in sqlcdb.UpdateEmployeeParams) (postgres.Employee, error) {
	return s.store.UpdateEmployee(ctx, in)
}
func (s *Service) OffboardEmployee(ctx context.Context, id string) (postgres.Employee, error) {
	var updated postgres.Employee
	err := s.change(ctx, EventOffboardingComplete, map[string]string{
		"employeeId": id,
	}, func(st *postgres.Store) error {
		var txErr error
		updated, txErr = st.UpdateEmployeeStatus(ctx, sqlcdb.UpdateEmployeeStatusParams{
			ID:	id,
			Status:	"terminated",
		})
		return txErr
	})
	return updated, err
}
func (s *Service) DeleteEmployee(ctx context.Context, id string) error {
	return s.store.DeleteEmployee(ctx, id)
}
func (s *Service) ListLeaveRequests(ctx context.Context, employeeID *string) ([]postgres.LeaveRequest, error) {
	if employeeID != nil && *employeeID != "" {
		return s.store.ListLeaveRequestsByEmployee(ctx, *employeeID)
	}
	return s.store.ListLeaveRequests(ctx)
}
func (s *Service) GetLeaveRequest(ctx context.Context, id string) (postgres.LeaveRequest, error) {
	lr, err := s.store.GetLeaveRequestByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.LeaveRequest{}, ErrNotFound
		}
		return postgres.LeaveRequest{}, err
	}
	return lr, nil
}
func (s *Service) CreateLeaveRequest(ctx context.Context, in sqlcdb.CreateLeaveRequestParams) (postgres.LeaveRequest, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateLeaveRequest(ctx, in)
}
func (s *Service) ApproveLeaveRequest(ctx context.Context, id string, approvedBy string) (postgres.LeaveRequest, error) {
	var updated postgres.LeaveRequest
	err := s.change(ctx, EventLeaveApproved, map[string]string{
		"leaveRequestId":	id,
		"approvedBy":		approvedBy,
	}, func(st *postgres.Store) error {
		var txErr error
		updated, txErr = st.UpdateLeaveRequestStatus(ctx, sqlcdb.UpdateLeaveRequestStatusParams{
			ID:		id,
			Status:		"approved",
			ApprovedBy:	&approvedBy,
		})
		return txErr
	})
	return updated, err
}
func (s *Service) RecordAttendance(ctx context.Context, in sqlcdb.RecordAttendanceParams) (postgres.AttendanceEntry, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.RecordAttendance(ctx, in)
}
func (s *Service) ListAttendance(ctx context.Context, employeeID string) ([]postgres.AttendanceEntry, error) {
	return s.store.ListAttendanceByEmployee(ctx, employeeID)
}
type PayrollRunWithItems struct {
	postgres.PayrollRun
	Items	[]postgres.PayrollItem	`json:"items"`
}
func (s *Service) GetPayrollRun(ctx context.Context, id string) (PayrollRunWithItems, error) {
	run, err := s.store.GetPayrollRunByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PayrollRunWithItems{}, ErrNotFound
		}
		return PayrollRunWithItems{}, err
	}
	items, err := s.store.ListPayrollItems(ctx, run.ID)
	if err != nil {
		return PayrollRunWithItems{}, err
	}
	return PayrollRunWithItems{PayrollRun: run, Items: items}, nil
}
func (s *Service) ListPayrollRuns(ctx context.Context) ([]postgres.PayrollRun, error) {
	return s.store.ListPayrollRuns(ctx)
}
func (s *Service) CreatePayrollRun(ctx context.Context, in sqlcdb.CreatePayrollRunParams, items []sqlcdb.InsertPayrollItemParams) (PayrollRunWithItems, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var out PayrollRunWithItems
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		created, err := st.CreatePayrollRun(ctx, in)
		if err != nil {
			return err
		}
		out.PayrollRun = created
		for _, item := range items {
			if item.ID == "" {
				item.ID = uuid.NewString()
			}
			item.PayrollRunID = created.ID
			inserted, err := st.InsertPayrollItem(ctx, item)
			if err != nil {
				return err
			}
			out.Items = append(out.Items, inserted)
		}
		return nil
	})
	return out, err
}
func (s *Service) ProcessPayrollRun(ctx context.Context, id string, approvedBy string) (postgres.PayrollRun, error) {
	var updated postgres.PayrollRun
	err := s.change(ctx, EventPayrollProcessed, map[string]string{
		"payrollRunId":	id,
		"approvedBy":	approvedBy,
	}, func(st *postgres.Store) error {
		var txErr error
		updated, txErr = st.UpdatePayrollRunStatus(ctx, sqlcdb.UpdatePayrollRunStatusParams{
			ID:		id,
			Status:		"processed",
			ApprovedBy:	&approvedBy,
		})
		return txErr
	})
	return updated, err
}
