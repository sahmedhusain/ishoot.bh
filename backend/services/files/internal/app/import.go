package app

import (
	"bytes"
	"context"
	"errors"

	"platform.local/backend/services/files/internal/domain"
	"platform.local/backend/services/files/internal/remote"
)

var (
	// ErrImportsOff means this installation does not fetch links.
	ErrImportsOff = errors.New("imports from links are switched off")
	// ErrSourceBlocked means the link is not a public http(s) address.
	ErrSourceBlocked = errors.New("the link is not a public web address")
	// ErrSourceUnreachable means the link did not answer with a file.
	ErrSourceUnreachable = errors.New("the link did not answer with a file")
)

// Importer downloads a file from a link (remote.Fetcher).
type Importer interface {
	Fetch(ctx context.Context, link string) (remote.Fetched, error)
}

// SetImporter turns on imports from links.
func (s *Service) SetImporter(i Importer) { s.importer = i }

// Import downloads the file at link into an upload for owner in folder, exactly as if they had sent it themselves: it
// must be a type the folder accepts (judged by its bytes), and it expires unless claimed. The profile picture editor
// uses it so a picture given as a link can be cropped in the browser.
func (s *Service) Import(ctx context.Context, owner, folder, link string) (domain.File, error) {
	if s.importer == nil {
		return domain.File{}, ErrImportsOff
	}
	if owner == "" {
		return domain.File{}, domain.ErrNotOwner
	}
	got, err := s.importer.Fetch(ctx, link)
	switch {
	case errors.Is(err, remote.ErrTooLarge):
		return domain.File{}, domain.ErrTooLarge
	case errors.Is(err, remote.ErrBlocked):
		return domain.File{}, ErrSourceBlocked
	case err != nil:
		return domain.File{}, errors.Join(ErrSourceUnreachable, err)
	}
	size := int64(len(got.Body))
	if err := s.checkSize(size); err != nil {
		return domain.File{}, err
	}
	mime := domain.DetectType(got.Body[:min(domain.SniffLength, len(got.Body))])
	if mime == "" {
		return domain.File{}, domain.ErrTypeNotAllowed
	}
	name := got.FileName
	if name == "" {
		name = "imported"
	}
	f, err := s.Register(ctx, RegisterInput{OwnerID: owner, Folder: folder, FileName: name, MIMEType: mime, Size: size})
	if err != nil {
		return domain.File{}, err
	}
	return s.WriteUpload(ctx, f.URL, owner, bytes.NewReader(got.Body), size)
}
