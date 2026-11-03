// Package app holds the finance service's use cases.
package app

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/finance/internal/postgres"
	"platform.local/backend/services/finance/internal/postgres/sqlcdb"
)

var (
	ErrNotFound = errors.New("finance resource not found")
	ErrConflict = errors.New("finance resource conflict")
)

const (
	EventInvoiceIssued   = "finance.invoice.issued"
	EventPaymentRecorded = "finance.payment.recorded"
	EventExpenseApproved = "finance.expense.approved"
)

type Service struct {
	store *postgres.Store
	now   func() time.Time
}

func New(store *postgres.Store) *Service {
	return &Service{
		store: store,
		now:   time.Now,
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

// Invoices
type InvoiceWithItems struct {
	postgres.Invoice
	Items []postgres.InvoiceItem `json:"items"`
}

func (s *Service) GetInvoice(ctx context.Context, id string) (InvoiceWithItems, error) {
	inv, err := s.store.GetInvoiceByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return InvoiceWithItems{}, ErrNotFound
		}
		return InvoiceWithItems{}, err
	}
	items, err := s.store.ListInvoiceItems(ctx, inv.ID)
	if err != nil {
		return InvoiceWithItems{}, err
	}
	return InvoiceWithItems{Invoice: inv, Items: items}, nil
}

func (s *Service) ListInvoices(ctx context.Context) ([]postgres.Invoice, error) {
	return s.store.ListInvoices(ctx)
}

func (s *Service) CreateInvoice(ctx context.Context, inv sqlcdb.CreateInvoiceParams, items []sqlcdb.InsertInvoiceItemParams) (InvoiceWithItems, error) {
	if inv.ID == "" {
		inv.ID = uuid.NewString()
	}
	var out InvoiceWithItems
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		created, err := st.CreateInvoice(ctx, inv)
		if err != nil {
			return err
		}
		out.Invoice = created
		for _, item := range items {
			if item.ID == "" {
				item.ID = uuid.NewString()
			}
			item.InvoiceID = created.ID
			inserted, err := st.InsertInvoiceItem(ctx, item)
			if err != nil {
				return err
			}
			out.Items = append(out.Items, inserted)
		}
		return nil
	})
	return out, err
}

func (s *Service) UpdateInvoiceStatus(ctx context.Context, id string, status string) (postgres.Invoice, error) {
	if status == "issued" {
		var updated postgres.Invoice
		err := s.change(ctx, EventInvoiceIssued, map[string]string{"invoiceId": id, "status": status}, func(st *postgres.Store) error {
			var txErr error
			updated, txErr = st.UpdateInvoiceStatus(ctx, sqlcdb.UpdateInvoiceStatusParams{ID: id, Status: status})
			return txErr
		})
		return updated, err
	}
	return s.store.UpdateInvoiceStatus(ctx, sqlcdb.UpdateInvoiceStatusParams{ID: id, Status: status})
}

func (s *Service) DeleteInvoice(ctx context.Context, id string) error {
	return s.store.DeleteInvoice(ctx, id)
}

// Payments
func (s *Service) GetPayment(ctx context.Context, id string) (postgres.Payment, error) {
	p, err := s.store.GetPaymentByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Payment{}, ErrNotFound
		}
		return postgres.Payment{}, err
	}
	return p, nil
}

func (s *Service) ListPayments(ctx context.Context, invoiceID *string) ([]postgres.Payment, error) {
	if invoiceID != nil && *invoiceID != "" {
		return s.store.ListPaymentsByInvoice(ctx, invoiceID)
	}
	return s.store.ListPayments(ctx)
}

func (s *Service) RecordPayment(ctx context.Context, in sqlcdb.CreatePaymentParams) (postgres.Payment, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.Payment
	err := s.change(ctx, EventPaymentRecorded, map[string]any{
		"paymentId":     in.ID,
		"paymentNumber": in.PaymentNumber,
		"invoiceId":     in.InvoiceID,
	}, func(st *postgres.Store) error {
		var txErr error
		created, txErr = st.CreatePayment(ctx, in)
		if txErr != nil {
			return txErr
		}
		if in.InvoiceID != nil && *in.InvoiceID != "" {
			_, txErr = st.RecordPaymentOnInvoice(ctx, *in.InvoiceID, in.Amount)
		}
		return txErr
	})
	return created, err
}

func (s *Service) DeletePayment(ctx context.Context, id string) error {
	return s.store.DeletePayment(ctx, id)
}

// Expense Categories
func (s *Service) ListExpenseCategories(ctx context.Context) ([]postgres.ExpenseCategory, error) {
	return s.store.ListExpenseCategories(ctx)
}

func (s *Service) CreateExpenseCategory(ctx context.Context, in sqlcdb.CreateExpenseCategoryParams) (postgres.ExpenseCategory, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateExpenseCategory(ctx, in)
}

func (s *Service) UpdateExpenseCategory(ctx context.Context, in sqlcdb.UpdateExpenseCategoryParams) (postgres.ExpenseCategory, error) {
	return s.store.UpdateExpenseCategory(ctx, in)
}

func (s *Service) DeleteExpenseCategory(ctx context.Context, id string) error {
	return s.store.DeleteExpenseCategory(ctx, id)
}

// Expenses
func (s *Service) GetExpense(ctx context.Context, id string) (postgres.Expense, error) {
	e, err := s.store.GetExpenseByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Expense{}, ErrNotFound
		}
		return postgres.Expense{}, err
	}
	return e, nil
}

func (s *Service) ListExpenses(ctx context.Context) ([]postgres.Expense, error) {
	return s.store.ListExpenses(ctx)
}

func (s *Service) CreateExpense(ctx context.Context, in sqlcdb.CreateExpenseParams) (postgres.Expense, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateExpense(ctx, in)
}

func (s *Service) UpdateExpense(ctx context.Context, in sqlcdb.UpdateExpenseParams) (postgres.Expense, error) {
	return s.store.UpdateExpense(ctx, in)
}

func (s *Service) ApproveExpense(ctx context.Context, id string, approvedBy string) (postgres.Expense, error) {
	var updated postgres.Expense
	err := s.change(ctx, EventExpenseApproved, map[string]string{"expenseId": id, "approvedBy": approvedBy}, func(st *postgres.Store) error {
		var txErr error
		updated, txErr = st.UpdateExpenseStatus(ctx, sqlcdb.UpdateExpenseStatusParams{
			ID:         id,
			Status:     "approved",
			ApprovedBy: &approvedBy,
		})
		return txErr
	})
	return updated, err
}

func (s *Service) DeleteExpense(ctx context.Context, id string) error {
	return s.store.DeleteExpense(ctx, id)
}

// Bank Settlements
func (s *Service) ListBankSettlements(ctx context.Context) ([]postgres.BankSettlement, error) {
	return s.store.ListBankSettlements(ctx)
}

func (s *Service) CreateBankSettlement(ctx context.Context, in sqlcdb.CreateBankSettlementParams) (postgres.BankSettlement, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateBankSettlement(ctx, in)
}
