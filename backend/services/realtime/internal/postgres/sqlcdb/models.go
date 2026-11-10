package sqlcdb
import (
	"time"
)
type RealtimeStatus struct {
	Realm		string
	UserID		string
	Status		string
	Message		*string
	ExpiresAt	*time.Time
	UpdatedAt	time.Time
}
type RealtimeStatusWindow struct {
	ID		string
	Realm		string
	UserID		string
	Source		string
	SourceID	string
	Kind		string
	StartsAt	time.Time
	EndsAt		time.Time
	UpdatedAt	time.Time
}
