package sqlcdb
import (
	"time"
)
type FilesUploadObject struct {
	ID		string
	FileUrl		string
	OwnerID		*string
	FileName	string
	FileSize	int64
	MimeType	string
	IsPublic	bool
	ClaimedAt	*time.Time
	ExpiresAt	time.Time
	CreatedAt	time.Time
}
