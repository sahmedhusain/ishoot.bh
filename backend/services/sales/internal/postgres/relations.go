package postgres

import (
	"context"

	"platform.local/backend/services/sales/internal/postgres/sqlcdb"
)

type DealPipelineStage = sqlcdb.SalesDealPipelineStage
type CatalogItemRef = sqlcdb.SalesCatalogItemRef

func (s *Store) ListQuotationsByContact(ctx context.Context, contactID string) ([]Quotation, error) {
	return s.q.ListQuotationsByContact(ctx, &contactID)
}

func (s *Store) ListQuotationsByDeal(ctx context.Context, dealID string) ([]Quotation, error) {
	return s.q.ListQuotationsByDeal(ctx, &dealID)
}

func (s *Store) SetQuotationInvoiceID(ctx context.Context, quotationID string, invoiceID *string) (Quotation, error) {
	return s.q.SetQuotationInvoiceID(ctx, sqlcdb.SetQuotationInvoiceIDParams{
		ID:        quotationID,
		InvoiceID: invoiceID,
	})
}

func (s *Store) ClearQuotationInvoiceID(ctx context.Context, invoiceID string) error {
	return s.q.ClearQuotationInvoiceID(ctx, &invoiceID)
}

func (s *Store) ListDealPipelineStages(ctx context.Context) ([]DealPipelineStage, error) {
	return s.q.ListDealPipelineStages(ctx)
}

func (s *Store) UpsertCatalogItemRef(ctx context.Context, p sqlcdb.UpsertSalesCatalogItemRefParams) error {
	return s.q.UpsertSalesCatalogItemRef(ctx, p)
}

func (s *Store) DeleteCatalogItemRef(ctx context.Context, kind, id string) error {
	return s.q.DeleteSalesCatalogItemRef(ctx, sqlcdb.DeleteSalesCatalogItemRefParams{
		Kind: kind,
		ID:   id,
	})
}

func (s *Store) ListCatalogItems(ctx context.Context) ([]CatalogItemRef, error) {
	return s.q.ListSalesCatalogItems(ctx)
}
