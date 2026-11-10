package domain
import (
	"errors"
	"regexp"
	"strings"
	"time"
	"github.com/google/uuid"
	"platform.local/backend/pkg/catalog"
)
var (
	ErrInvalidURL		= errors.New("invalid file address")
	ErrTypeNotAllowed	= errors.New("file type not allowed here")
	ErrTooLarge		= errors.New("file too large")
	ErrNotFound		= errors.New("file not found")
	ErrNotOwner		= errors.New("upload belongs to someone else")
	ErrUnavailable		= errors.New("upload expired or already claimed")
	ErrContentMismatch	= errors.New("stored bytes do not match the upload")
	ErrExists		= errors.New("file already exists")
	ErrNotPrivate		= errors.New("file is public")
)
var SniffLength = catalog.Files.SniffLength()
var namePattern = regexp.MustCompile(`^[A-Za-z0-9_-]+\.([a-z0-9]+)$`)
type Location struct {
	Folder	catalog.FileFolder
	Name	string
	Type	catalog.FileType
}
func (l Location) URL() string	{ return catalog.Files.URLPrefix + l.Folder.Key + "/" + l.Name }
func (l Location) Key() string	{ return l.Folder.Key + "/" + l.Name }
func ParseURL(fileURL string) (Location, error) {
	rest, ok := strings.CutPrefix(fileURL, catalog.Files.URLPrefix)
	if !ok {
		return Location{}, ErrInvalidURL
	}
	folderKey, name, ok := strings.Cut(rest, "/")
	if !ok {
		return Location{}, ErrInvalidURL
	}
	folder, ok := catalog.Files.Folder(folderKey)
	match := namePattern.FindStringSubmatch(name)
	if !ok || match == nil {
		return Location{}, ErrInvalidURL
	}
	for _, mime := range folder.Types {
		t, _ := catalog.Files.Type(mime)
		for _, ext := range t.Extensions {
			if ext == match[1] {
				return Location{Folder: folder, Name: name, Type: t}, nil
			}
		}
	}
	return Location{}, ErrTypeNotAllowed
}
var unsafeNameChars = regexp.MustCompile(`[^A-Za-z0-9_-]`)
func NewLocation(folderKey, originalName, mime string) (Location, error) {
	folder, ok := catalog.Files.Folder(folderKey)
	if !ok {
		return Location{}, ErrInvalidURL
	}
	t, ok := catalog.Files.Type(mime)
	if !ok || !folder.Allows(mime) {
		return Location{}, ErrTypeNotAllowed
	}
	base := originalName
	if dot := strings.LastIndex(base, "."); dot > 0 {
		base = base[:dot]
	}
	base = unsafeNameChars.ReplaceAllString(base, "_")
	if len(base) > 40 {
		base = base[:40]
	}
	return Location{Folder: folder, Name: uuid.NewString() + "_" + base + "." + t.Extensions[0], Type: t}, nil
}
var prefixPattern = regexp.MustCompile(`^[a-z0-9_]{1,40}$`)
func GeneratedLocation(folderKey, prefix, mime string) (Location, error) {
	folder, ok := catalog.Files.Folder(folderKey)
	if !ok || !prefixPattern.MatchString(prefix) {
		return Location{}, ErrInvalidURL
	}
	t, ok := catalog.Files.Type(mime)
	if !ok || !folder.Allows(mime) {
		return Location{}, ErrTypeNotAllowed
	}
	return Location{Folder: folder, Name: prefix + "_" + uuid.NewString() + "." + t.Extensions[0], Type: t}, nil
}
func DetectType(head []byte) string	{ return catalog.Files.DetectType(head) }
type File struct {
	ID		string
	URL		string
	OwnerID		string
	FileName	string
	Size		int64
	MIMEType	string
	Public		bool
	ClaimedAt	*time.Time
	ExpiresAt	time.Time
	CreatedAt	time.Time
}
func (f File) Claimable(owner string, now time.Time) error {
	switch {
	case f.OwnerID == "" || f.OwnerID != owner:
		return ErrNotOwner
	case f.ClaimedAt != nil || !f.ExpiresAt.After(now):
		return ErrUnavailable
	}
	return nil
}
func CleanFileName(name string) string {
	name = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f || r == '/' || r == '\\' {
			return -1
		}
		return r
	}, strings.TrimSpace(name))
	if runes := []rune(name); len(runes) > 200 {
		name = string(runes[:200])
	}
	return name
}
