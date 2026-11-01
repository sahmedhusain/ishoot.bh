// Package domain holds the files service's rules: which file addresses are valid, how a file's real type is read
// from its first bytes, and the states an upload goes through. It has no I/O.
package domain

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	"platform.local/backend/pkg/catalog"
)

// Errors the use cases return; the HTTP layer maps each to a problem code.
var (
	ErrInvalidURL      = errors.New("invalid file address")
	ErrTypeNotAllowed  = errors.New("file type not allowed here")
	ErrTooLarge        = errors.New("file too large")
	ErrNotFound        = errors.New("file not found")
	ErrNotOwner        = errors.New("upload belongs to someone else")
	ErrUnavailable     = errors.New("upload expired or already claimed")
	ErrContentMismatch = errors.New("stored bytes do not match the upload")
	ErrExists          = errors.New("file already exists")
	ErrNotPrivate      = errors.New("file is public")
)

// SniffLength is how many leading bytes DetectType needs.
var SniffLength = catalog.Files.SniffLength()

var namePattern = regexp.MustCompile(`^[A-Za-z0-9_-]+\.([a-z0-9]+)$`)

// Location is where a file lives: a catalogue folder and a file name. Its URL ("/api/files/<folder>/<name>") is the
// identifier other services store.
type Location struct {
	Folder catalog.FileFolder
	Name   string
	Type   catalog.FileType
}

// URL returns the file's address.
func (l Location) URL() string { return catalog.Files.URLPrefix + l.Folder.Key + "/" + l.Name }

// Key returns the object key inside its bucket.
func (l Location) Key() string { return l.Folder.Key + "/" + l.Name }

// ParseURL validates a file address against the catalogue: known folder, safe name, and an extension of a type
// the folder accepts.
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

// NewLocation names a new upload in folder: a random prefix, then up to 40 safe characters of the original name.
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

// GeneratedLocation names a file the platform stores in folder from its detected type: "<prefix>_<random>.<ext>".
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

// DetectType reads the media type from a file's first bytes (signatures from the catalogue), so a renamed file
// cannot pass as an image or PDF. It returns "" for anything the catalogue does not accept.
func DetectType(head []byte) string { return catalog.Files.DetectType(head) }

// File is the record of a stored file. OwnerID is the staff user who uploaded it; it is empty for files the platform
// stores itself (seed data, generated labels, website visitors' attachments).
type File struct {
	ID        string
	URL       string
	OwnerID   string
	FileName  string
	Size      int64
	MIMEType  string
	Public    bool
	ClaimedAt *time.Time
	ExpiresAt time.Time
	CreatedAt time.Time
}

// Claimable reports why an upload cannot be claimed by owner at now, or nil.
func (f File) Claimable(owner string, now time.Time) error {
	switch {
	case f.OwnerID == "" || f.OwnerID != owner:
		return ErrNotOwner
	case f.ClaimedAt != nil || !f.ExpiresAt.After(now):
		return ErrUnavailable
	}
	return nil
}

// CleanFileName keeps a display name printable and bounded.
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
