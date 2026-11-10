package sqlcdb
import (
	"encoding/json"
	"time"
	"github.com/jackc/pgx/v5/pgtype"
)
type DeliveryCodSettlement struct {
	ID		string
	SheetID		*string
	DriverID	string
	AmountCollected	pgtype.Numeric
	AmountSettled	pgtype.Numeric
	Status		string
	SettledAt	*time.Time
	CreatedAt	time.Time
}
type DeliveryCourierAgency struct {
	ID		string
	Name		string
	ContactName	*string
	Email		*string
	Phone		*string
	ApiEndpoint	*string
	IsActive	bool
	CreatedAt	time.Time
}
type DeliveryDeliverySetting struct {
	ID		string
	Mode		string
	SlaHours	int32
	TimeZone	*string
	SlotDays	int32
	LeadMinutes	int32
	RequireSlot	bool
	UpdatedAt	time.Time
}
type DeliveryDeliverySlot struct {
	ID		string
	ZoneID		*string
	Weekday		int32
	SlotStart	string
	SlotEnd		string
	Capacity	*int32
	IsActive	bool
	CreatedAt	time.Time
}
type DeliveryDeliveryZone struct {
	ID		string
	NameEn		string
	NameAr		string
	Areas		[]string
	Fee		pgtype.Numeric
	MinOrder	pgtype.Numeric
	FreeOver	pgtype.Numeric
	IsActive	bool
	SortOrder	int32
	CreatedAt	time.Time
	UpdatedAt	time.Time
}
type DeliveryInbox struct {
	Consumer	string
	EventID		string
	HandledAt	time.Time
}
type DeliveryOutbox struct {
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
type DeliveryRouteSheet struct {
	ID		string
	Number		string
	DriverID	*string
	VehicleID	*string
	Status		string
	RunDate		pgtype.Date
	CreatedAt	time.Time
	UpdatedAt	time.Time
}
type DeliveryShipment struct {
	ID		string
	Number		string
	OrderID		string
	Status		string
	Method		string
	ZoneID		*string
	SlotID		*string
	SlotDate	*time.Time
	SlotStart	*string
	SlotEnd		*string
	PromisedBy	time.Time
	RecipientName	string
	RecipientPhone	string
	Address		json.RawMessage
	CodAmount	pgtype.Numeric
	CodCollected	pgtype.Numeric
	TrackingToken	string
	Attempts	int32
	FailureReason	*string
	OutAt		*time.Time
	DeliveredAt	*time.Time
	DriverID	*string
	VehicleID	*string
	RouteSheetID	*string
	RouteStop	*int32
	ProofPhotoUrl	*string
	ProofSignature	*string
	AgencyID	*string
	TrackingNumber	*string
	CreatedAt	time.Time
	UpdatedAt	time.Time
}
type DeliveryShipmentEvent struct {
	ID		string
	ShipmentID	string
	Status		string
	Reason		*string
	Note		*string
	ByID		*string
	At		time.Time
}
type DeliveryVehicle struct {
	ID		string
	Plate		string
	Name		string
	Kind		string
	Notes		*string
	IsActive	bool
	CreatedAt	time.Time
	UpdatedAt	time.Time
}
