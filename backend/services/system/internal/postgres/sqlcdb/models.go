package sqlcdb
import (
	"encoding/json"
	"time"
	"github.com/jackc/pgx/v5/pgtype"
)
type SystemApiKey struct {
	ID		string
	Name		string
	KeyPrefix	string
	KeyHash		string
	Scopes		[]string
	RateLimit	int32
	LastUsedAt	*time.Time
	ExpiresAt	*time.Time
	CreatedBy	string
	CreatedAt	time.Time
	RevokedAt	*time.Time
}
type SystemBackupRecord struct {
	ID		string
	Kind		string
	FileName	string
	FileSize	int64
	Checksum	string
	Status		string
	ErrorMessage	*string
	CreatedBy	string
	CreatedAt	time.Time
	VerifiedAt	*time.Time
	Details		json.RawMessage
}
type SystemCompany struct {
	ID		string
	Singleton	bool
	Data		json.RawMessage
	CurrencyLocked	bool
	Revision	int64
	UpdatedBy	string
	UpdatedAt	time.Time
}
type SystemCompanyAsset struct {
	ID		string
	AssetKey	string
	Title		string
	FileUrl		string
	MimeType	*string
	FileSize	*int64
	CreatedAt	time.Time
	UpdatedAt	time.Time
}
type SystemDebugToggle struct {
	ID		string
	Service		string
	LogLevel	string
	EnabledBy	string
	EnabledAt	time.Time
	ExpiresAt	time.Time
}
type SystemDocumentSequence struct {
	Kind		string
	Prefix		string
	NextNumber	int64
}
type SystemInbox struct {
	Consumer	string
	EventID		string
	HandledAt	time.Time
}
type SystemIntegrationSetting struct {
	Provider	string
	IsActive	bool
	Credentials	*string
	Config		json.RawMessage
	SyncLeaseToken	*string
	SyncLeaseUntil	*time.Time
	HealthStatus	string
	LastCheckedAt	*time.Time
	LastError	*string
	AccountName	*string
	LastSyncedAt	*time.Time
	UpdatedAt	time.Time
	UpdatedBy	*string
}
type SystemModuleSetting struct {
	ModuleKey	string
	Enabled		bool
	UpdatedBy	*string
	UpdatedAt	time.Time
}
type SystemNumberReservation struct {
	Caller		string
	IdempotencyKey	string
	Kind		string
	DocumentDate	pgtype.Date
	DocumentNumber	string
	CreatedAt	time.Time
}
type SystemOutbox struct {
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
type SystemSiteSetting struct {
	ID		bool
	WebsiteDomain	*string
	AdminDomain	*string
	Code		json.RawMessage
	UpdatedAt	time.Time
	UpdatedBy	*string
}
