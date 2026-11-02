// Package postgres stores finance entities in the finance schema.
package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/finance/internal/postgres/sqlcdb"
)

const Schema = "finance"

type Invoice = sqlcdb.FinanceInvoice
type InvoiceItem = sqlcdb.FinanceInvoiceItem
type Payment = sqlcdb.FinancePayment
type ExpenseCategory = sqlcdb.FinanceExpenseCategory
type Expense = sqlcdb.FinanceExpense
type BankSettlement = sqlcdb.FinanceBankSettlement

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

// Invoices
func (s *Store) GetInvoiceByID(ctx context.Context, id string) (Invoice, error) {
	return s.q.GetInvoiceByID(ctx, id)
}
func (s *Store) GetInvoiceByNumber(ctx context.Context, number string) (Invoice, error) {
	return s.q.GetInvoiceByNumber(ctx, number)
}
func (s *Store) ListInvoices(ctx context.Context) ([]Invoice, error) {
	return s.q.ListInvoices(ctx)
}
func (s *Store) CreateInvoice(ctx context.Context, p sqlcdb.CreateInvoiceParams) (Invoice, error) {
	return s.q.CreateInvoice(ctx, p)
}
func (s *Store) UpdateInvoice(ctx context.Context, p sqlcdb.UpdateInvoiceParams) (Invoice, error) {
	return s.q.UpdateInvoice(ctx, p)
}
func (s *Store) UpdateInvoiceStatus(ctx context.Context, p sqlcdb.UpdateInvoiceStatusParams) (Invoice, error) {
	return s.q.UpdateInvoiceStatus(ctx, p)
}
func (s *Store) RecordPaymentOnInvoice(ctx context.Context, id string, amount pgtype.Numeric) (Invoice, error) {
	return s.q.RecordPaymentOnInvoice(ctx, sqlcdb.RecordPaymentOnInvoiceParams{ID: id, AmountPaid: amount})
}
func (s *Store) DeleteInvoice(ctx context.Context, id string) error {
	return s.q.DeleteInvoice(ctx, id)
}
func (s *Store) ListInvoiceItems(ctx context.Context, invoiceID string) ([]InvoiceItem, error) {
	return s.q.ListInvoiceItems(ctx, invoiceID)
}
func (s *Store) InsertInvoiceItem(ctx context.Context, p sqlcdb.InsertInvoiceItemParams) (InvoiceItem, error) {
	return s.q.InsertInvoiceItem(ctx, p)
}
func (s *Store) DeleteInvoiceItems(ctx context.Context, invoiceID string) error {
	return s.q.DeleteInvoiceItems(ctx, invoiceID)
}

// Payments
func (s *Store) GetPaymentByID(ctx context.Context, id string) (Payment, error) {
	return s.q.GetPaymentByID(ctx, id)
}
func (s *Store) ListPayments(ctx context.Context) ([]Payment, error) {
	return s.q.ListPayments(ctx)
}
func (s *Store) ListPaymentsByInvoice(ctx context.Context, invoiceID *string) ([]Payment, error) {
	return s.q.ListPaymentsByInvoice(ctx, invoiceID)
}
func (s *Store) CreatePayment(ctx context.Context, p sqlcdb.CreatePaymentParams) (Payment, error) {
	return s.q.CreatePayment(ctx, p)
}
func (s *Store) DeletePayment(ctx context.Context, id string) error {
	return s.q.DeletePayment(ctx, id)
}

// Expense Categories
func (s *Store) ListExpenseCategories(ctx context.Context) ([]ExpenseCategory, error) {
	return s.q.ListExpenseCategories(ctx)
}
func (s *Store) CreateExpenseCategory(ctx context.Context, p sqlcdb.CreateExpenseCategoryParams) (ExpenseCategory, error) {
	return s.q.CreateExpenseCategory(ctx, p)
}
func (s *Store) UpdateExpenseCategory(ctx context.Context, p sqlcdb.UpdateExpenseCategoryParams) (ExpenseCategory, error) {
	return s.q.UpdateExpenseCategory(ctx, p)
}
func (s *Store) DeleteExpenseCategory(ctx context.Context, id string) error {
	return s.q.DeleteExpenseCategory(ctx, id)
}

// Expenses
func (s *Store) GetExpenseByID(ctx context.Context, id string) (Expense, error) {
	return s.q.GetExpenseByID(ctx, id)
}
func (s *Store) ListExpenses(ctx context.Context) ([]Expense, error) {
	return s.q.ListExpenses(ctx)
}
func (s *Store) CreateExpense(ctx context.Context, p sqlcdb.CreateExpenseParams) (Expense, error) {
	return s.q.CreateExpense(ctx, p)
}
func (s *Store) UpdateExpense(ctx context.Context, p sqlcdb.UpdateExpenseParams) (Expense, error) {
	return s.q.UpdateExpense(ctx, p)
}
func (s *Store) UpdateExpenseStatus(ctx context.Context, p sqlcdb.UpdateExpenseStatusParams) (Expense, error) {
	return s.q.UpdateExpenseStatus(ctx, p)
}
func (s *Store) DeleteExpense(ctx context.Context, id string) error {
	return s.q.DeleteExpense(ctx, id)
}

// Bank Settlements
func (s *Store) ListBankSettlements(ctx context.Context) ([]BankSettlement, error) {
	return s.q.ListBankSettlements(ctx)
}
func (s *Store) CreateBankSettlement(ctx context.Context, p sqlcdb.CreateBankSettlementParams) (BankSettlement, error) {
	return s.q.CreateBankSettlement(ctx, p)
}
