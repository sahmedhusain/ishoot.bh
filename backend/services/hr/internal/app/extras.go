package app

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/services/hr/internal/postgres"
)

func (s *Service) Pool() *pgxpool.Pool {
	if s == nil || s.store == nil {
		return nil
	}
	return s.store.Pool()
}

func (s *Service) UpdateDepartmentPartial(ctx context.Context, id string, in postgres.UpdateDepartmentInput) (postgres.Department, error) {
	return s.store.UpdateDepartmentFields(ctx, id, in)
}

func (s *Service) DeleteDepartmentDirect(ctx context.Context, id string) error {
	return s.store.DeleteDepartmentByID(ctx, id)
}

func (s *Service) AssignUsersToDepartment(ctx context.Context, userIDs []string, departmentID *string) error {
	return s.store.AssignUsersToDepartment(ctx, userIDs, departmentID)
}

func (s *Service) UpdateEmployeePartial(ctx context.Context, id string, in postgres.UpdateEmployeeInput) (postgres.Employee, error) {
	return s.store.UpdateEmployeeFields(ctx, id, in)
}

func (s *Service) ListLeaveTypes(ctx context.Context) (json.RawMessage, error) {
	return s.store.ListLeaveTypes(ctx)
}

func (s *Service) ListShiftTypes(ctx context.Context) (json.RawMessage, error) {
	return s.store.ListShiftTypes(ctx)
}

func (s *Service) ListGosiComponents(ctx context.Context) (json.RawMessage, error) {
	return s.store.ListGosiComponents(ctx)
}

func (s *Service) ListEmployeeGosiRecords(ctx context.Context) (json.RawMessage, error) {
	return s.store.ListEmployeeGosiRecords(ctx)
}

func (s *Service) GetGosiSettings(ctx context.Context) (json.RawMessage, error) {
	return s.store.GetGosiSettings(ctx)
}

func (s *Service) ListSalaryDocuments(ctx context.Context) (json.RawMessage, error) {
	return s.store.ListSalaryDocuments(ctx)
}

func (s *Service) SaveShiftType(ctx context.Context, id, code, nameEn, nameAr, allowanceMode string, allowanceValue float64, isActive bool) (json.RawMessage, error) {
	return s.store.SaveShiftType(ctx, id, code, nameEn, nameAr, allowanceMode, allowanceValue, isActive)
}

func (s *Service) SaveLeaveType(ctx context.Context, id, code, nameEn, nameAr string, daysAllowed float64, isPaid bool, payPercent int) (json.RawMessage, error) {
	return s.store.SaveLeaveType(ctx, id, code, nameEn, nameAr, daysAllowed, isPaid, payPercent)
}

func (s *Service) DeleteAttendanceByEmployeeDate(ctx context.Context, employeeID, date string) error {
	return s.store.DeleteAttendanceByEmployeeDate(ctx, employeeID, date)
}

func (s *Service) ListEmployeeSupports(ctx context.Context) (json.RawMessage, error) {
	return s.store.ListEmployeeSupports(ctx)
}

func (s *Service) ListAllPayrollItemsJSON(ctx context.Context) (json.RawMessage, error) {
	return s.store.ListAllPayrollItemsJSON(ctx)
}

func (s *Service) ListLeaveAdjustments(ctx context.Context) (json.RawMessage, error) {
	return s.store.ListLeaveAdjustments(ctx)
}

func (s *Service) GetEmployeeExtendedProfile(ctx context.Context, id string) (postgres.EmployeeExtendedProfile, error) {
	return s.store.GetEmployeeExtendedProfile(ctx, id)
}

func (s *Service) SaveEmployeeExtendedProfile(ctx context.Context, id string, in postgres.EmployeeExtendedProfile) (postgres.EmployeeExtendedProfile, error) {
	return s.store.SaveEmployeeExtendedProfile(ctx, id, in)
}
