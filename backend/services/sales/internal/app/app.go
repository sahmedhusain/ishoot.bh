// Package app holds the sales service's use cases.
package app

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/sales/internal/postgres"
	"platform.local/backend/services/sales/internal/postgres/sqlcdb"
)

var (
	ErrNotFound = errors.New("sales resource not found")
	ErrConflict = errors.New("sales resource conflict")
)

const (
	EventInquiryCreated    = "sales.inquiry.created"
	EventDealWon           = "sales.deal.won"
	EventQuotationIssued   = "sales.quotation.issued"
	EventQuotationAccepted = "sales.quotation.accepted"
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

// Contacts
func (s *Service) GetContact(ctx context.Context, id string) (postgres.Contact, error) {
	c, err := s.store.GetContactByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Contact{}, ErrNotFound
		}
		return postgres.Contact{}, err
	}
	return c, nil
}

func (s *Service) ListContacts(ctx context.Context) ([]postgres.Contact, error) {
	return s.store.ListContacts(ctx)
}

func (s *Service) CreateContact(ctx context.Context, in sqlcdb.CreateContactParams) (postgres.Contact, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateContact(ctx, in)
}

func (s *Service) UpdateContact(ctx context.Context, in sqlcdb.UpdateContactParams) (postgres.Contact, error) {
	return s.store.UpdateContact(ctx, in)
}

func (s *Service) DeleteContact(ctx context.Context, id string) error {
	return s.store.DeleteContact(ctx, id)
}

// Deals
func (s *Service) GetDeal(ctx context.Context, id string) (postgres.Deal, error) {
	d, err := s.store.GetDealByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Deal{}, ErrNotFound
		}
		return postgres.Deal{}, err
	}
	return d, nil
}

func (s *Service) ListDeals(ctx context.Context, contactID *string) ([]postgres.Deal, error) {
	if contactID != nil && *contactID != "" {
		return s.store.ListDealsByContact(ctx, contactID)
	}
	return s.store.ListDeals(ctx)
}

func (s *Service) CreateDeal(ctx context.Context, in sqlcdb.CreateDealParams) (postgres.Deal, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateDeal(ctx, in)
}

func (s *Service) UpdateDeal(ctx context.Context, in sqlcdb.UpdateDealParams) (postgres.Deal, error) {
	return s.store.UpdateDeal(ctx, in)
}

func (s *Service) UpdateDealStage(ctx context.Context, id string, stage string, status string) (postgres.Deal, error) {
	var updated postgres.Deal
	var err error
	if stage == "won" {
		err = s.change(ctx, EventDealWon, map[string]string{"dealId": id, "stage": stage}, func(st *postgres.Store) error {
			var txErr error
			updated, txErr = st.UpdateDealStage(ctx, sqlcdb.UpdateDealStageParams{ID: id, Stage: stage, Status: "won"})
			return txErr
		})
	} else {
		updated, err = s.store.UpdateDealStage(ctx, sqlcdb.UpdateDealStageParams{ID: id, Stage: stage, Status: status})
	}
	return updated, err
}

func (s *Service) DeleteDeal(ctx context.Context, id string) error {
	return s.store.DeleteDeal(ctx, id)
}

// Inquiries
func (s *Service) GetInquiry(ctx context.Context, id string) (postgres.Inquiry, error) {
	i, err := s.store.GetInquiryByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Inquiry{}, ErrNotFound
		}
		return postgres.Inquiry{}, err
	}
	return i, nil
}

func (s *Service) ListInquiries(ctx context.Context) ([]postgres.Inquiry, error) {
	return s.store.ListInquiries(ctx)
}

func (s *Service) CreateInquiry(ctx context.Context, in sqlcdb.CreateInquiryParams) (postgres.Inquiry, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.Inquiry
	err := s.change(ctx, EventInquiryCreated, map[string]string{
		"inquiryId":      in.ID,
		"requesterEmail": in.RequesterEmail,
		"subject":        in.Subject,
	}, func(st *postgres.Store) error {
		var txErr error
		created, txErr = st.CreateInquiry(ctx, in)
		return txErr
	})
	return created, err
}

func (s *Service) UpdateInquiryStatus(ctx context.Context, id string, status string) (postgres.Inquiry, error) {
	return s.store.UpdateInquiryStatus(ctx, sqlcdb.UpdateInquiryStatusParams{ID: id, Status: status})
}

func (s *Service) AssignInquiry(ctx context.Context, id string, assigneeID *string) (postgres.Inquiry, error) {
	return s.store.AssignInquiry(ctx, sqlcdb.AssignInquiryParams{ID: id, AssigneeID: assigneeID})
}

func (s *Service) DeleteInquiry(ctx context.Context, id string) error {
	return s.store.DeleteInquiry(ctx, id)
}

// Quotations
type QuotationWithItems struct {
	postgres.Quotation
	Items []postgres.QuotationItem `json:"items"`
}

func (s *Service) GetQuotation(ctx context.Context, id string) (QuotationWithItems, error) {
	q, err := s.store.GetQuotationByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return QuotationWithItems{}, ErrNotFound
		}
		return QuotationWithItems{}, err
	}
	items, err := s.store.ListQuotationItems(ctx, q.ID)
	if err != nil {
		return QuotationWithItems{}, err
	}
	return QuotationWithItems{Quotation: q, Items: items}, nil
}

func (s *Service) ListQuotations(ctx context.Context) ([]postgres.Quotation, error) {
	return s.store.ListQuotations(ctx)
}

func (s *Service) CreateQuotation(ctx context.Context, q sqlcdb.CreateQuotationParams, items []sqlcdb.InsertQuotationItemParams) (QuotationWithItems, error) {
	if q.ID == "" {
		q.ID = uuid.NewString()
	}
	var out QuotationWithItems
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		created, err := st.CreateQuotation(ctx, q)
		if err != nil {
			return err
		}
		out.Quotation = created
		for _, item := range items {
			if item.ID == "" {
				item.ID = uuid.NewString()
			}
			item.QuotationID = created.ID
			inserted, err := st.InsertQuotationItem(ctx, item)
			if err != nil {
				return err
			}
			out.Items = append(out.Items, inserted)
		}
		return nil
	})
	return out, err
}

func (s *Service) UpdateQuotationStatus(ctx context.Context, id string, status string) (postgres.Quotation, error) {
	var updated postgres.Quotation
	var eventSubject string
	switch status {
	case "issued":
		eventSubject = EventQuotationIssued
	case "accepted":
		eventSubject = EventQuotationAccepted
	}

	if eventSubject != "" {
		err := s.change(ctx, eventSubject, map[string]string{"quotationId": id, "status": status}, func(st *postgres.Store) error {
			var txErr error
			updated, txErr = st.UpdateQuotationStatus(ctx, sqlcdb.UpdateQuotationStatusParams{ID: id, Status: status})
			return txErr
		})
		return updated, err
	}
	return s.store.UpdateQuotationStatus(ctx, sqlcdb.UpdateQuotationStatusParams{ID: id, Status: status})
}

func (s *Service) DeleteQuotation(ctx context.Context, id string) error {
	return s.store.DeleteQuotation(ctx, id)
}

// Campaigns
func (s *Service) GetCampaign(ctx context.Context, id string) (postgres.Campaign, error) {
	c, err := s.store.GetCampaignByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Campaign{}, ErrNotFound
		}
		return postgres.Campaign{}, err
	}
	return c, nil
}

func (s *Service) ListCampaigns(ctx context.Context) ([]postgres.Campaign, error) {
	return s.store.ListCampaigns(ctx)
}

func (s *Service) CreateCampaign(ctx context.Context, in sqlcdb.CreateCampaignParams) (postgres.Campaign, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateCampaign(ctx, in)
}

func (s *Service) UpdateCampaign(ctx context.Context, in sqlcdb.UpdateCampaignParams) (postgres.Campaign, error) {
	return s.store.UpdateCampaign(ctx, in)
}

func (s *Service) DeleteCampaign(ctx context.Context, id string) error {
	return s.store.DeleteCampaign(ctx, id)
}
