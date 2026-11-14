package app

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/hr/internal/postgres"
)

const (
	IdentityEventsConsumer = "hr-identity-events"
	SubjectIdentityUsers   = "identity.user.>"
)

type EmployeeWithRelations struct {
	postgres.Employee
	UserID        *string                         `json:"userId,omitempty"`
	ManagerID     *string                         `json:"managerId,omitempty"`
	Credentials   []postgres.EmployeeCredential   `json:"credentials,omitempty"`
	Handovers     []postgres.EmployeeHandover     `json:"handovers,omitempty"`
	RecurringPay  []postgres.EmployeeRecurringPay `json:"recurringPay,omitempty"`
	LeaveBalances []postgres.LeaveBalance         `json:"leaveBalances,omitempty"`
	PayItems      []postgres.EmployeePayItem      `json:"payItems,omitempty"`
}

func (s *Service) UpdateEmployeeLinks(ctx context.Context, id string, patch postgres.EmployeeLinksPatch) (postgres.EmployeeLinkInfo, error) {
	var out postgres.EmployeeLinkInfo
	err := s.store.Tx(ctx, func(_ *postgres.Store, tx pgx.Tx) error {
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{
			Subject: EventEmployeeUpserted,
			Payload: map[string]any{
				"kind":         "employee",
				"id":           id,
				"userId":       patch.UserID,
				"managerId":    patch.ManagerID,
				"departmentId": patch.DepartmentID,
			},
		})
	})
	if err != nil {
		return out, err
	}
	out, err = s.store.UpdateEmployeeLinks(ctx, id, patch)
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrNotFound
	}
	return out, err
}

func (s *Service) GetEmployeeRelations(ctx context.Context, id string) (EmployeeWithRelations, error) {
	emp, err := s.GetEmployee(ctx, id)
	if err != nil {
		return EmployeeWithRelations{}, err
	}
	links, _ := s.store.GetEmployeeLinks(ctx, id)
	creds, err := s.store.ListCredentials(ctx, id)
	if err != nil {
		return EmployeeWithRelations{}, err
	}
	handovers, err := s.store.ListHandovers(ctx, id, "")
	if err != nil {
		return EmployeeWithRelations{}, err
	}
	recPay, err := s.store.ListRecurringPay(ctx, id)
	if err != nil {
		return EmployeeWithRelations{}, err
	}
	balances, err := s.store.ListLeaveBalances(ctx, id, 0)
	if err != nil {
		return EmployeeWithRelations{}, err
	}
	payItems, err := s.store.ListEmployeePayItems(ctx, id)
	if err != nil {
		return EmployeeWithRelations{}, err
	}
	return EmployeeWithRelations{
		Employee:      emp,
		UserID:        links.UserID,
		ManagerID:     links.ManagerID,
		Credentials:   creds,
		Handovers:     handovers,
		RecurringPay:  recPay,
		LeaveBalances: balances,
		PayItems:      payItems,
	}, nil
}

func (s *Service) ListCredentials(ctx context.Context, employeeID string) ([]postgres.EmployeeCredential, error) {
	return s.store.ListCredentials(ctx, employeeID)
}

func (s *Service) SaveCredential(ctx context.Context, in postgres.EmployeeCredential) (postgres.EmployeeCredential, error) {
	return s.store.UpsertCredential(ctx, in)
}

func (s *Service) DeleteCredential(ctx context.Context, id string) error {
	return s.store.DeleteCredential(ctx, id)
}

func (s *Service) ListHandovers(ctx context.Context, employeeID, delegateUserID string) ([]postgres.EmployeeHandover, error) {
	return s.store.ListHandovers(ctx, employeeID, delegateUserID)
}

func (s *Service) SaveHandover(ctx context.Context, in postgres.EmployeeHandover) (postgres.EmployeeHandover, error) {
	return s.store.UpsertHandover(ctx, in)
}

func (s *Service) ListRecurringPay(ctx context.Context, employeeID string) ([]postgres.EmployeeRecurringPay, error) {
	return s.store.ListRecurringPay(ctx, employeeID)
}

func (s *Service) SaveRecurringPay(ctx context.Context, in postgres.EmployeeRecurringPay) (postgres.EmployeeRecurringPay, error) {
	return s.store.UpsertRecurringPay(ctx, in)
}

func (s *Service) DeleteRecurringPay(ctx context.Context, id string) error {
	return s.store.DeleteRecurringPay(ctx, id)
}

func (s *Service) ListLeaveBalances(ctx context.Context, employeeID string, year int32) ([]postgres.LeaveBalance, error) {
	return s.store.ListLeaveBalances(ctx, employeeID, year)
}

func (s *Service) SaveLeaveBalance(ctx context.Context, in postgres.LeaveBalance) (postgres.LeaveBalance, error) {
	return s.store.UpsertLeaveBalance(ctx, in)
}

func (s *Service) ListEmployeePayItems(ctx context.Context, employeeID string) ([]postgres.EmployeePayItem, error) {
	return s.store.ListEmployeePayItems(ctx, employeeID)
}

func (s *Service) ListAttendanceByDate(ctx context.Context, d pgtype.Date) ([]postgres.AttendanceEntry, error) {
	return s.store.ListAttendanceByDate(ctx, d)
}

func (s *Service) ListIdentityUserRefs(ctx context.Context, realm string) ([]postgres.IdentityUserRef, error) {
	return s.store.ListIdentityUserRefs(ctx, realm)
}

func (s *Service) HandleIdentityUserEvent(ctx context.Context, eventID, subject string, payload []byte) error {
	var in struct {
		SubjectID   string `json:"subjectId"`
		Realm       string `json:"realm"`
		DisplayName string `json:"displayName"`
		Email       string `json:"email"`
	}
	if err := json.Unmarshal(payload, &in); err != nil {
		return nil
	}
	if in.SubjectID == "" {
		return nil
	}
	return s.store.SyncIdentityUserEvent(ctx, IdentityEventsConsumer, eventID, subject, in.SubjectID, in.Realm, in.DisplayName, in.Email)
}
