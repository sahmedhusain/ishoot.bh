package sqlcdb
import (
	"encoding/json"
	"time"
	"github.com/jackc/pgx/v5/pgtype"
)
type CommerceCoupon struct {
	ID			string
	Code			string
	DiscountType		string
	DiscountValue		pgtype.Numeric
	MinOrderAmount		pgtype.Numeric
	MaxDiscountAmount	pgtype.Numeric
	StartsAt		*time.Time
	ExpiresAt		*time.Time
	UsageLimit		*int32
	UsageCount		int32
	IsActive		bool
	CreatedAt		time.Time
}
type CommerceCustomer struct {
	ID		string
	Email		*string
	Phone		*string
	FirstName	string
	LastName	string
	Status		string
	CreatedAt	time.Time
	UpdatedAt	time.Time
}
type CommerceCustomerAddress struct {
	ID		string
	CustomerID	string
	AddressType	string
	Label		string
	Line1		string
	Line2		string
	City		string
	State		string
	PostalCode	string
	Country		string
	IsDefault	bool
}
type CommerceInbox struct {
	Consumer	string
	EventID		string
	HandledAt	time.Time
}
type CommerceOutbox struct {
	ID		string
	Subject		string
	Payload		json.RawMessage
	Headers		json.RawMessage
	CreatedAt	time.Time
	PublishedAt	*time.Time
	Attempts	int32
	NextTryAt	time.Time
	LastError	*string
}
type CommerceRetailClosing struct {
	ID		string
	ShiftID		string
	ClosingDate	pgtype.Date
	TotalSales	pgtype.Numeric
	TotalCash	pgtype.Numeric
	TotalCard	pgtype.Numeric
	Notes		*string
}
type CommerceRetailRegister struct {
	ID		string
	Name		string
	BranchID	*string
	IsActive	bool
}
type CommerceRetailShift struct {
	ID		string
	RegisterID	string
	CashierID	string
	OpenedAt	time.Time
	ClosedAt	*time.Time
	StartingCash	pgtype.Numeric
	ClosingCash	pgtype.Numeric
	ExpectedCash	pgtype.Numeric
	Status		string
}
type CommerceSalesOrder struct {
	ID		string
	Number		string
	CustomerID	*string
	ContactID	*string
	Email		*string
	Name		string
	Phone		*string
	Channel		string
	Status		string
	PaymentStatus	string
	PaymentMethod	string
	Fulfilment	string
	ShippingAddress	[]byte
	Subtotal	pgtype.Numeric
	DiscountAmount	pgtype.Numeric
	CouponCode	*string
	VatAmount	pgtype.Numeric
	DeliveryFee	pgtype.Numeric
	Total		pgtype.Numeric
	AmountPaid	pgtype.Numeric
	AmountRefunded	pgtype.Numeric
	Currency	string
	Locale		string
	Note		*string
	WarehouseID	*string
	InvoiceID	*string
	CreatedByID	*string
	PlacedAt	time.Time
	PaidAt		*time.Time
	ShippedAt	*time.Time
	DeliveredAt	*time.Time
	CancelledAt	*time.Time
	UtmCampaign	*string
	UtmSource	*string
	UtmMedium	*string
	UpdatedAt	time.Time
}
type CommerceSalesOrderEvent struct {
	ID		string
	OrderID		string
	Kind		string
	Status		*string
	Note		*string
	Amount		pgtype.Numeric
	ByID		*string
	CreatedAt	time.Time
}
type CommerceSalesOrderLine struct {
	ID			string
	OrderID			string
	ProductID		string
	VariantKey		string
	Sku			string
	Description		string
	Quantity		pgtype.Numeric
	UnitPrice		pgtype.Numeric
	VatExempt		bool
	LineTotal		pgtype.Numeric
	LocationID		*string
	ReturnedQuantity	pgtype.Numeric
	SortOrder		int32
}
type CommerceStoreSetting struct {
	ID			string
	Currency		string
	TaxInclusive		bool
	DefaultTaxRate		pgtype.Numeric
	MinimumOrderAmount	pgtype.Numeric
	FreeShippingThreshold	pgtype.Numeric
}
