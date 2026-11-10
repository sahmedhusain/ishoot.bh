package app
import (
	"bytes"
	"context"
	"errors"
	"platform.local/backend/services/files/internal/domain"
	"platform.local/backend/services/files/internal/remote"
)
var (
	ErrImportsOff	= errors.New("imports from links are switched off")
	ErrSourceBlocked	= errors.New("the link is not a public web address")
	ErrSourceUnreachable	= errors.New("the link did not answer with a file")
)
type Importer interface {
	Fetch(ctx context.Context, link string) (remote.Fetched, error)
}
func (s *Service) SetImporter(i Importer)	{ s.importer = i }
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
