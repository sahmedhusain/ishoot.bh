package postgres
import (
	"context"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/sales/internal/postgres/sqlcdb"
)
const Schema = "sales"
type Contact = sqlcdb.SalesContact
type Deal = sqlcdb.SalesDeal
type Inquiry = sqlcdb.SalesInquiry
type Quotation = sqlcdb.SalesQuotation
type QuotationItem = sqlcdb.SalesQuotationItem
type Campaign = sqlcdb.SalesCampaign
type Store struct {
	pool	*pgxpool.Pool
	q	*sqlcdb.Queries
}
func New(pool *pgxpool.Pool) *Store	{ return &Store{pool: pool, q: sqlcdb.New(pool)} }
func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}
func (s *Store) GetContactByID(ctx context.Context, id string) (Contact, error) {
	return s.q.GetContactByID(ctx, id)
}
func (s *Store) ListContacts(ctx context.Context) ([]Contact, error) {
	return s.q.ListContacts(ctx)
}
func (s *Store) CreateContact(ctx context.Context, p sqlcdb.CreateContactParams) (Contact, error) {
	return s.q.CreateContact(ctx, p)
}
func (s *Store) UpdateContact(ctx context.Context, p sqlcdb.UpdateContactParams) (Contact, error) {
	return s.q.UpdateContact(ctx, p)
}
func (s *Store) DeleteContact(ctx context.Context, id string) error {
	return s.q.DeleteContact(ctx, id)
}
func (s *Store) GetDealByID(ctx context.Context, id string) (Deal, error) {
	return s.q.GetDealByID(ctx, id)
}
func (s *Store) ListDeals(ctx context.Context) ([]Deal, error) {
	return s.q.ListDeals(ctx)
}
func (s *Store) ListDealsByContact(ctx context.Context, contactID *string) ([]Deal, error) {
	return s.q.ListDealsByContact(ctx, contactID)
}
func (s *Store) CreateDeal(ctx context.Context, p sqlcdb.CreateDealParams) (Deal, error) {
	return s.q.CreateDeal(ctx, p)
}
func (s *Store) UpdateDeal(ctx context.Context, p sqlcdb.UpdateDealParams) (Deal, error) {
	return s.q.UpdateDeal(ctx, p)
}
func (s *Store) UpdateDealStage(ctx context.Context, p sqlcdb.UpdateDealStageParams) (Deal, error) {
	return s.q.UpdateDealStage(ctx, p)
}
func (s *Store) DeleteDeal(ctx context.Context, id string) error {
	return s.q.DeleteDeal(ctx, id)
}
func (s *Store) GetInquiryByID(ctx context.Context, id string) (Inquiry, error) {
	return s.q.GetInquiryByID(ctx, id)
}
func (s *Store) ListInquiries(ctx context.Context) ([]Inquiry, error) {
	return s.q.ListInquiries(ctx)
}
func (s *Store) CreateInquiry(ctx context.Context, p sqlcdb.CreateInquiryParams) (Inquiry, error) {
	return s.q.CreateInquiry(ctx, p)
}
func (s *Store) UpdateInquiryStatus(ctx context.Context, p sqlcdb.UpdateInquiryStatusParams) (Inquiry, error) {
	return s.q.UpdateInquiryStatus(ctx, p)
}
func (s *Store) AssignInquiry(ctx context.Context, p sqlcdb.AssignInquiryParams) (Inquiry, error) {
	return s.q.AssignInquiry(ctx, p)
}
func (s *Store) DeleteInquiry(ctx context.Context, id string) error {
	return s.q.DeleteInquiry(ctx, id)
}
func (s *Store) GetQuotationByID(ctx context.Context, id string) (Quotation, error) {
	return s.q.GetQuotationByID(ctx, id)
}
func (s *Store) GetQuotationByNumber(ctx context.Context, number string) (Quotation, error) {
	return s.q.GetQuotationByNumber(ctx, number)
}
func (s *Store) ListQuotations(ctx context.Context) ([]Quotation, error) {
	return s.q.ListQuotations(ctx)
}
func (s *Store) CreateQuotation(ctx context.Context, p sqlcdb.CreateQuotationParams) (Quotation, error) {
	return s.q.CreateQuotation(ctx, p)
}
func (s *Store) UpdateQuotation(ctx context.Context, p sqlcdb.UpdateQuotationParams) (Quotation, error) {
	return s.q.UpdateQuotation(ctx, p)
}
func (s *Store) UpdateQuotationStatus(ctx context.Context, p sqlcdb.UpdateQuotationStatusParams) (Quotation, error) {
	return s.q.UpdateQuotationStatus(ctx, p)
}
func (s *Store) DeleteQuotation(ctx context.Context, id string) error {
	return s.q.DeleteQuotation(ctx, id)
}
func (s *Store) ListQuotationItems(ctx context.Context, quotationID string) ([]QuotationItem, error) {
	return s.q.ListQuotationItems(ctx, quotationID)
}
func (s *Store) InsertQuotationItem(ctx context.Context, p sqlcdb.InsertQuotationItemParams) (QuotationItem, error) {
	return s.q.InsertQuotationItem(ctx, p)
}
func (s *Store) DeleteQuotationItems(ctx context.Context, quotationID string) error {
	return s.q.DeleteQuotationItems(ctx, quotationID)
}
func (s *Store) GetCampaignByID(ctx context.Context, id string) (Campaign, error) {
	return s.q.GetCampaignByID(ctx, id)
}
func (s *Store) ListCampaigns(ctx context.Context) ([]Campaign, error) {
	return s.q.ListCampaigns(ctx)
}
func (s *Store) CreateCampaign(ctx context.Context, p sqlcdb.CreateCampaignParams) (Campaign, error) {
	return s.q.CreateCampaign(ctx, p)
}
func (s *Store) UpdateCampaign(ctx context.Context, p sqlcdb.UpdateCampaignParams) (Campaign, error) {
	return s.q.UpdateCampaign(ctx, p)
}
func (s *Store) DeleteCampaign(ctx context.Context, id string) error {
	return s.q.DeleteCampaign(ctx, id)
}
