package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/finance/internal/postgres"
	"platform.local/backend/services/finance/internal/postgres/sqlcdb"
)

const (
	EventInvoiceCreated     = "finance.invoice.created"
	EventInvoiceDeleted     = "finance.invoice.deleted"
	DomainSyncConsumer      = "finance-domain-sync"
)

type AllocationInput struct {
	InvoiceID       string         `json:"invoiceId"`
	AllocatedAmount pgtype.Numeric `json:"allocatedAmount"`
	Currency        *string        `json:"currency,omitempty"`
}

type PaymentWithDetails struct {
	postgres.Payment
	Allocations []postgres.PaymentAllocation `json:"allocations"`
}

type QuotationSnapshotItem struct {
	ID            string  `json:"id"`
	ItemKind      string  `json:"itemKind"`
	ServiceID     *string `json:"serviceId"`
	ProductID     *string `json:"productId"`
	VariantID     *string `json:"variantId"`
	Sku           *string `json:"sku"`
	Unit          *string `json:"unit"`
	Description   string  `json:"description"`
	DescriptionEn string  `json:"descriptionEn"`
	DescriptionAr string  `json:"descriptionAr"`
	Quantity      float64 `json:"quantity"`
	UnitPrice     float64 `json:"unitPrice"`
	TaxRate       float64 `json:"taxRate"`
	Amount        float64 `json:"amount"`
	SortOrder     int32   `json:"sortOrder"`
}

type CreateInvoiceFromQuotationInput struct {
	QuotationID     string                  `json:"quotationId"`
	InvoiceNumber   string                  `json:"invoiceNumber"`
	IssueDate       *pgtype.Date            `json:"issueDate"`
	DueDate         *pgtype.Date            `json:"dueDate"`
	Notes           *string                 `json:"notes"`
	Terms           *string                 `json:"terms"`
	QuotationNumber string                  `json:"quotationNumber,omitempty"`
	DealID          *string                 `json:"dealId,omitempty"`
	ContactID       *string                 `json:"contactId,omitempty"`
	Currency        string                  `json:"currency,omitempty"`
	Subtotal        float64                 `json:"subtotal,omitempty"`
	Discount        float64                 `json:"discount,omitempty"`
	VatRate         float64                 `json:"vatRate,omitempty"`
	VatAmount       float64                 `json:"vatAmount,omitempty"`
	Total           float64                 `json:"total,omitempty"`
	Items           []QuotationSnapshotItem `json:"items,omitempty"`
}

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

func defaultInvoiceItemFields(item *sqlcdb.InsertInvoiceItemParams, idx int) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	if item.ItemKind == "" {
		switch {
		case item.ServiceID != nil && *item.ServiceID != "":
			item.ItemKind = "service"
		case item.ProductID != nil && *item.ProductID != "":
			item.ItemKind = "product"
		default:
			item.ItemKind = "custom"
		}
	}
	if item.DescriptionEn == "" {
		item.DescriptionEn = item.Description
	}
	if item.Description == "" {
		item.Description = item.DescriptionEn
	}
	if item.SortOrder == 0 {
		item.SortOrder = int32(idx)
	}
}

func (s *Service) ListInvoicesFiltered(ctx context.Context, contactID, quotationID *string) ([]postgres.Invoice, error) {
	if quotationID != nil && *quotationID != "" {
		return s.store.ListInvoicesByQuotation(ctx, *quotationID)
	}
	if contactID != nil && *contactID != "" {
		return s.store.ListInvoicesByContact(ctx, *contactID)
	}
	return s.store.ListInvoices(ctx)
}

func (s *Service) ListPaymentsFiltered(ctx context.Context, invoiceID, contactID *string) ([]postgres.Payment, error) {
	if invoiceID != nil && *invoiceID != "" {
		return s.store.ListPaymentsByInvoice(ctx, invoiceID)
	}
	if contactID != nil && *contactID != "" {
		return s.store.ListPaymentsByContact(ctx, *contactID)
	}
	return s.store.ListPayments(ctx)
}

func (s *Service) GetPaymentDetails(ctx context.Context, id string) (PaymentWithDetails, error) {
	p, err := s.store.GetPaymentByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PaymentWithDetails{}, ErrNotFound
		}
		return PaymentWithDetails{}, err
	}
	allocs, err := s.store.ListPaymentAllocationsByPayment(ctx, id)
	if err != nil {
		return PaymentWithDetails{}, err
	}
	return PaymentWithDetails{Payment: p, Allocations: allocs}, nil
}

func (s *Service) CreateInvoiceFromQuotation(ctx context.Context, in CreateInvoiceFromQuotationInput) (InvoiceWithItems, error) {
	if in.QuotationID == "" {
		return InvoiceWithItems{}, ErrConflict
	}
	qref, err := s.store.GetQuotationRef(ctx, in.QuotationID)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) || in.QuotationNumber == "" {
			if errors.Is(err, pgx.ErrNoRows) {
				return InvoiceWithItems{}, ErrNotFound
			}
			return InvoiceWithItems{}, err
		}
		// Fallback bootstrap when creating from pre-existing seeded quotation
		rawItems, _ := json.Marshal(in.Items)
		currency := in.Currency
		if currency == "" {
			currency = "BHD"
		}
		_ = s.store.UpsertQuotationRef(ctx, sqlcdb.UpsertFinanceQuotationRefParams{
			ID:              in.QuotationID,
			QuotationNumber: in.QuotationNumber,
			DealID:          in.DealID,
			ContactID:       in.ContactID,
			Currency:        currency,
			Subtotal:        numericFromFloat(in.Subtotal),
			Discount:        numericFromFloat(in.Discount),
			VatRate:         numericFromFloat(in.VatRate),
			VatAmount:       numericFromFloat(in.VatAmount),
			Total:           numericFromFloat(in.Total),
			Status:          "accepted",
			Items:           rawItems,
		})
		qref, err = s.store.GetQuotationRef(ctx, in.QuotationID)
		if err != nil {
			return InvoiceWithItems{}, err
		}
	}

	var snapItems []QuotationSnapshotItem
	if len(qref.Items) > 0 {
		_ = json.Unmarshal(qref.Items, &snapItems)
	}
	if len(snapItems) == 0 && len(in.Items) > 0 {
		snapItems = in.Items
	}

	now := s.now().UTC()
	issueDate := pgtype.Date{Time: now, Valid: true}
	if in.IssueDate != nil && in.IssueDate.Valid {
		issueDate = *in.IssueDate
	}
	dueDate := pgtype.Date{Time: now.AddDate(0, 0, 30), Valid: true}
	if in.DueDate != nil && in.DueDate.Valid {
		dueDate = *in.DueDate
	}

	invNumber := in.InvoiceNumber
	if invNumber == "" {
		invNumber = fmt.Sprintf("INV-%s-%04d", now.Format("20060102"), now.Unix()%10000)
	}

	qid := qref.ID
	zeroPaid := numericFromFloat(0)
	invParams := sqlcdb.CreateInvoiceParams{
		ID:            uuid.NewString(),
		InvoiceNumber: invNumber,
		QuotationID:   &qid,
		ContactID:     qref.ContactID,
		DealID:        qref.DealID,
		Status:        "draft",
		IssueDate:     issueDate,
		DueDate:       dueDate,
		Subtotal:      qref.Subtotal,
		Discount:      qref.Discount,
		VatRate:       qref.VatRate,
		VatAmount:     qref.VatAmount,
		Total:         qref.Total,
		AmountPaid:    zeroPaid,
		BalanceDue:    qref.Total,
		Currency:      qref.Currency,
		Notes:         in.Notes,
		Terms:         in.Terms,
	}

	items := make([]sqlcdb.InsertInvoiceItemParams, 0, len(snapItems))
	for idx, it := range snapItems {
		items = append(items, sqlcdb.InsertInvoiceItemParams{
			ID:            uuid.NewString(),
			ItemKind:      it.ItemKind,
			ServiceID:     it.ServiceID,
			ProductID:     it.ProductID,
			VariantID:     it.VariantID,
			Sku:           it.Sku,
			Unit:          it.Unit,
			Description:   it.Description,
			DescriptionEn: it.DescriptionEn,
			DescriptionAr: it.DescriptionAr,
			Quantity:      numericFromFloat(it.Quantity),
			UnitPrice:     numericFromFloat(it.UnitPrice),
			TaxRate:       numericFromFloat(it.TaxRate),
			Amount:        numericFromFloat(it.Amount),
			SortOrder:     int32(idx),
		})
	}
	return s.CreateInvoice(ctx, invParams, items)
}

func (s *Service) RecordPaymentWithAllocations(ctx context.Context, in sqlcdb.CreatePaymentParams, allocations []AllocationInput) (PaymentWithDetails, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.ReceiptNumber == nil || *in.ReceiptNumber == "" {
		rcp := "RCP-" + strings.TrimPrefix(in.PaymentNumber, "PAY-")
		if rcp == "RCP-" {
			rcp = fmt.Sprintf("RCP-%d", s.now().Unix())
		}
		in.ReceiptNumber = &rcp
	}
	if len(allocations) == 0 && in.InvoiceID != nil && *in.InvoiceID != "" {
		cur := in.Currency
		allocations = []AllocationInput{{
			InvoiceID:       *in.InvoiceID,
			AllocatedAmount: in.Amount,
			Currency:        &cur,
		}}
	}
	if (in.InvoiceID == nil || *in.InvoiceID == "") && len(allocations) == 1 && allocations[0].InvoiceID != "" {
		iid := allocations[0].InvoiceID
		in.InvoiceID = &iid
	}

	var result PaymentWithDetails
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		created, txErr := st.CreatePayment(ctx, in)
		if txErr != nil {
			return txErr
		}
		result.Payment = created

		for _, a := range allocations {
			if a.InvoiceID == "" {
				continue
			}
			cur := a.Currency
			if cur == nil || *cur == "" {
				c := created.Currency
				cur = &c
			}
			iid := a.InvoiceID
			pid := created.ID
			alloc, err := st.CreatePaymentAllocation(ctx, sqlcdb.CreatePaymentAllocationParams{
				ID:              uuid.NewString(),
				PaymentID:       &pid,
				InvoiceID:       &iid,
				AllocatedAmount: a.AllocatedAmount,
				Currency:        cur,
			})
			if err != nil {
				return err
			}
			result.Allocations = append(result.Allocations, alloc)
			if _, err := st.RecalculateInvoicePayments(ctx, iid); err != nil {
				return err
			}
		}

		if created.BankSettlementID != nil && *created.BankSettlementID != "" {
			pid := created.ID
			if _, err := st.LinkBankSettlementPayment(ctx, *created.BankSettlementID, &pid); err != nil {
				return err
			}
		}

		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{
			Subject: EventPaymentRecorded,
			Payload: map[string]any{
				"paymentId":        created.ID,
				"paymentNumber":    created.PaymentNumber,
				"receiptNumber":    created.ReceiptNumber,
				"invoiceId":        created.InvoiceID,
				"contactId":        created.ContactID,
				"amount":           numericToFloat(created.Amount),
				"currency":         created.Currency,
				"bankSettlementId": created.BankSettlementID,
			},
		})
	})
	return result, err
}

func (s *Service) ListCatalogItems(ctx context.Context) ([]postgres.CatalogItemRef, error) {
	return s.store.ListCatalogItems(ctx)
}

func (s *Service) ListContactsRef(ctx context.Context) ([]postgres.ContactRef, error) {
	return s.store.ListContactsRef(ctx)
}

func (s *Service) ListQuotationsRef(ctx context.Context) ([]postgres.QuotationRef, error) {
	return s.store.ListQuotationsRef(ctx)
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
		case subject == "sales.contact.upserted":
			var body struct {
				ID        string  `json:"id"`
				FirstName string  `json:"firstName"`
				LastName  *string `json:"lastName"`
				Company   *string `json:"company"`
				Email     *string `json:"email"`
				Phone     *string `json:"phone"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			if body.ID == "" {
				return nil
			}
			return st.UpsertContactRef(ctx, sqlcdb.UpsertFinanceContactRefParams{
				ID:        body.ID,
				FirstName: body.FirstName,
				LastName:  body.LastName,
				Company:   body.Company,
				Email:     body.Email,
				Phone:     body.Phone,
			})
		case subject == "sales.quotation.upserted":
			var body struct {
				ID              string          `json:"id"`
				QuotationNumber string          `json:"quotationNumber"`
				DealID          *string         `json:"dealId"`
				ContactID       *string         `json:"contactId"`
				Currency        string          `json:"currency"`
				Subtotal        float64         `json:"subtotal"`
				Discount        float64         `json:"discount"`
				VatRate         float64         `json:"vatRate"`
				VatAmount       float64         `json:"vatAmount"`
				Total           float64         `json:"total"`
				Status          string          `json:"status"`
				Items           json.RawMessage `json:"items"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			if body.ID == "" {
				return nil
			}
			itemsRaw := body.Items
			if len(itemsRaw) == 0 {
				itemsRaw = json.RawMessage("[]")
			}
			currency := body.Currency
			if currency == "" {
				currency = "BHD"
			}
			return st.UpsertQuotationRef(ctx, sqlcdb.UpsertFinanceQuotationRefParams{
				ID:              body.ID,
				QuotationNumber: body.QuotationNumber,
				DealID:          body.DealID,
				ContactID:       body.ContactID,
				Currency:        currency,
				Subtotal:        numericFromFloat(body.Subtotal),
				Discount:        numericFromFloat(body.Discount),
				VatRate:         numericFromFloat(body.VatRate),
				VatAmount:       numericFromFloat(body.VatAmount),
				Total:           numericFromFloat(body.Total),
				Status:          body.Status,
				Items:           itemsRaw,
			})
		case subject == "sales.quotation.deleted":
			var body struct {
				QuotationID string `json:"quotationId"`
				ID          string `json:"id"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			qid := body.QuotationID
			if qid == "" {
				qid = body.ID
			}
			if qid != "" {
				return st.DeleteQuotationRef(ctx, qid)
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
			return st.UpsertCatalogItemRef(ctx, sqlcdb.UpsertFinanceCatalogItemRefParams{
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
