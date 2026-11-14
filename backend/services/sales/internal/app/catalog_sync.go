package app

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/sales/internal/postgres"
	"platform.local/backend/services/sales/internal/postgres/sqlcdb"
)

const (
	EventContactUpserted   = "sales.contact.upserted"
	EventDealUpserted      = "sales.deal.upserted"
	EventQuotationUpserted = "sales.quotation.upserted"
	EventQuotationDeleted  = "sales.quotation.deleted"
	DomainSyncConsumer     = "sales-domain-sync"
)

func numericFromFloat(v float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.3f", v))
	return n
}

func numericToFloat(n pgtype.Numeric) float64 {
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return 0
	}
	return f.Float64
}

func contactPayload(c postgres.Contact) map[string]any {
	return map[string]any{
		"kind":      "contact",
		"id":        c.ID,
		"firstName": c.FirstName,
		"lastName":  c.LastName,
		"company":   c.Company,
		"email":     c.Email,
		"phone":     c.Phone,
		"type":      c.ContactType,
		"status":    c.Status,
	}
}

func dealPayload(d postgres.Deal) map[string]any {
	return map[string]any{
		"kind":            "deal",
		"id":              d.ID,
		"title":           d.Title,
		"contactId":       d.ContactID,
		"stage":           d.Stage,
		"pipelineStageId": d.PipelineStageID,
		"value":           numericToFloat(d.Value),
		"currency":        d.Currency,
		"status":          d.Status,
	}
}

func quotationPayload(q postgres.Quotation, items []postgres.QuotationItem) map[string]any {
	itemList := make([]map[string]any, 0, len(items))
	for _, it := range items {
		itemList = append(itemList, map[string]any{
			"id":            it.ID,
			"itemKind":      it.ItemKind,
			"serviceId":     it.ServiceID,
			"productId":     it.ProductID,
			"variantId":     it.VariantID,
			"sku":           it.Sku,
			"unit":          it.Unit,
			"description":   it.Description,
			"descriptionEn": it.DescriptionEn,
			"descriptionAr": it.DescriptionAr,
			"quantity":      numericToFloat(it.Quantity),
			"unitPrice":     numericToFloat(it.UnitPrice),
			"taxRate":       numericToFloat(it.TaxRate),
			"amount":        numericToFloat(it.Amount),
			"sortOrder":     it.SortOrder,
		})
	}
	contactID := q.ContactID
	if contactID == nil {
		contactID = q.ClientID
	}
	return map[string]any{
		"id":              q.ID,
		"quotationNumber": q.QuotationNumber,
		"dealId":          q.DealID,
		"contactId":       contactID,
		"currency":        q.Currency,
		"subtotal":        numericToFloat(q.Subtotal),
		"discount":        numericToFloat(q.Discount),
		"vatRate":         numericToFloat(q.VatRate),
		"vatAmount":       numericToFloat(q.VatAmount),
		"total":           numericToFloat(q.Total),
		"status":          q.Status,
		"items":           itemList,
	}
}

func (s *Service) ListDealPipelineStages(ctx context.Context) ([]postgres.DealPipelineStage, error) {
	return s.store.ListDealPipelineStages(ctx)
}

func (s *Service) ListCatalogItems(ctx context.Context) ([]postgres.CatalogItemRef, error) {
	return s.store.ListCatalogItems(ctx)
}

func (s *Service) ListQuotationsFiltered(ctx context.Context, contactID, dealID *string) ([]postgres.Quotation, error) {
	if dealID != nil && *dealID != "" {
		return s.store.ListQuotationsByDeal(ctx, *dealID)
	}
	if contactID != nil && *contactID != "" {
		return s.store.ListQuotationsByContact(ctx, *contactID)
	}
	return s.store.ListQuotations(ctx)
}

func (s *Service) HandleDomainEvent(ctx context.Context, eventID, subject string, payload []byte) error {
	if eventID == "" {
		return nil
	}
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, postgres.Schema, DomainSyncConsumer, eventID)
		if err != nil || !first {
			return err
		}
		switch {
		case subject == "finance.invoice.created":
			var body struct {
				InvoiceID   string  `json:"invoiceId"`
				ID          string  `json:"id"`
				QuotationID *string `json:"quotationId"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			invID := body.InvoiceID
			if invID == "" {
				invID = body.ID
			}
			if body.QuotationID != nil && *body.QuotationID != "" && invID != "" {
				_, _ = st.SetQuotationInvoiceID(ctx, *body.QuotationID, &invID)
			}
		case subject == "finance.invoice.deleted":
			var body struct {
				InvoiceID string `json:"invoiceId"`
				ID        string `json:"id"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			invID := body.InvoiceID
			if invID == "" {
				invID = body.ID
			}
			if invID != "" {
				return st.ClearQuotationInvoiceID(ctx, invID)
			}
		case subject == "system.service.upserted" || subject == "inventory.product.upserted":
			var body struct {
				Kind      string  `json:"kind"`
				ID        string  `json:"id"`
				VariantID string  `json:"variantId"`
				Sku       *string `json:"sku"`
				NameEn    string  `json:"nameEn"`
				NameAr    string  `json:"nameAr"`
				Unit      string  `json:"unit"`
				UnitPrice float64 `json:"unitPrice"`
				Currency  string  `json:"currency"`
				TaxRate   float64 `json:"taxRate"`
				IsActive  *bool   `json:"isActive"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			if body.ID == "" {
				return nil
			}
			kind := body.Kind
			if kind == "" {
				if strings.HasPrefix(subject, "system.service") {
					kind = "service"
				} else {
					kind = "product"
				}
			}
			unit := body.Unit
			if unit == "" {
				unit = "unit"
			}
			currency := body.Currency
			if currency == "" {
				currency = "BHD"
			}
			active := true
			if body.IsActive != nil {
				active = *body.IsActive
			}
			return st.UpsertCatalogItemRef(ctx, sqlcdb.UpsertSalesCatalogItemRefParams{
				Kind:      kind,
				ID:        body.ID,
				VariantID: body.VariantID,
				Sku:       body.Sku,
				NameEn:    body.NameEn,
				NameAr:    body.NameAr,
				Unit:      unit,
				UnitPrice: numericFromFloat(body.UnitPrice),
				Currency:  currency,
				TaxRate:   numericFromFloat(body.TaxRate),
				IsActive:  active,
			})
		case subject == "system.service.deleted" || subject == "inventory.product.deleted":
			var body struct {
				Kind string `json:"kind"`
				ID   string `json:"id"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			if body.ID == "" {
				return nil
			}
			kind := body.Kind
			if kind == "" {
				if strings.HasPrefix(subject, "system.service") {
					kind = "service"
				} else {
					kind = "product"
				}
			}
			return st.DeleteCatalogItemRef(ctx, kind, body.ID)
		}
		return nil
	})
}
