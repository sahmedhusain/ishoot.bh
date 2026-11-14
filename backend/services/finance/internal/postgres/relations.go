package postgres

import (
	"context"

	"platform.local/backend/services/finance/internal/postgres/sqlcdb"
)

type PaymentAllocation = sqlcdb.FinancePaymentAllocation
type ContactRef = sqlcdb.FinanceContactRef
type QuotationRef = sqlcdb.FinanceQuotationRef
type CatalogItemRef = sqlcdb.FinanceCatalogItemRef

func (s *Store) ListInvoicesByContact(ctx context.Context, contactID string) ([]Invoice, error) {
	return s.q.ListInvoicesByContact(ctx, &contactID)
}

func (s *Store) ListInvoicesByQuotation(ctx context.Context, quotationID string) ([]Invoice, error) {
	return s.q.ListInvoicesByQuotation(ctx, &quotationID)
}

func (s *Store) ListPaymentsByContact(ctx context.Context, contactID string) ([]Payment, error) {
	return s.q.ListPaymentsByContact(ctx, &contactID)
}

func (s *Store) LinkPaymentToSettlement(ctx context.Context, paymentID string, settlementID *string) (Payment, error) {
	return s.q.LinkPaymentToSettlement(ctx, sqlcdb.LinkPaymentToSettlementParams{
		ID:               paymentID,
		BankSettlementID: settlementID,
	})
}

func (s *Store) CreatePaymentAllocation(ctx context.Context, p sqlcdb.CreatePaymentAllocationParams) (PaymentAllocation, error) {
	return s.q.CreatePaymentAllocation(ctx, p)
}

func (s *Store) ListPaymentAllocationsByPayment(ctx context.Context, paymentID string) ([]PaymentAllocation, error) {
	return s.q.ListPaymentAllocationsByPayment(ctx, &paymentID)
}

func (s *Store) ListPaymentAllocationsByInvoice(ctx context.Context, invoiceID string) ([]PaymentAllocation, error) {
	return s.q.ListPaymentAllocationsByInvoice(ctx, &invoiceID)
}

func (s *Store) DeletePaymentAllocationsByPayment(ctx context.Context, paymentID string) error {
	return s.q.DeletePaymentAllocationsByPayment(ctx, &paymentID)
}

func (s *Store) RecalculateInvoicePayments(ctx context.Context, invoiceID string) (Invoice, error) {
	return s.q.RecalculateInvoicePayments(ctx, invoiceID)
}

func (s *Store) LinkBankSettlementPayment(ctx context.Context, settlementID string, paymentID *string) (BankSettlement, error) {
	return s.q.LinkBankSettlementPayment(ctx, sqlcdb.LinkBankSettlementPaymentParams{
		ID:        settlementID,
		PaymentID: paymentID,
	})
}

func (s *Store) UpsertContactRef(ctx context.Context, p sqlcdb.UpsertFinanceContactRefParams) error {
	return s.q.UpsertFinanceContactRef(ctx, p)
}

func (s *Store) ListContactsRef(ctx context.Context) ([]ContactRef, error) {
	return s.q.ListFinanceContacts(ctx)
}

func (s *Store) UpsertQuotationRef(ctx context.Context, p sqlcdb.UpsertFinanceQuotationRefParams) error {
	return s.q.UpsertFinanceQuotationRef(ctx, p)
}

func (s *Store) DeleteQuotationRef(ctx context.Context, id string) error {
	return s.q.DeleteFinanceQuotationRef(ctx, id)
}

func (s *Store) GetQuotationRef(ctx context.Context, id string) (QuotationRef, error) {
	return s.q.GetFinanceQuotationRef(ctx, id)
}

func (s *Store) ListQuotationsRef(ctx context.Context) ([]QuotationRef, error) {
	return s.q.ListFinanceQuotationsRef(ctx)
}

func (s *Store) UpsertCatalogItemRef(ctx context.Context, p sqlcdb.UpsertFinanceCatalogItemRefParams) error {
	return s.q.UpsertFinanceCatalogItemRef(ctx, p)
}

func (s *Store) DeleteCatalogItemRef(ctx context.Context, kind, id string) error {
	return s.q.DeleteFinanceCatalogItemRef(ctx, sqlcdb.DeleteFinanceCatalogItemRefParams{
		Kind: kind,
		ID:   id,
	})
}

func (s *Store) ListCatalogItems(ctx context.Context) ([]CatalogItemRef, error) {
	return s.q.ListFinanceCatalogItems(ctx)
}
