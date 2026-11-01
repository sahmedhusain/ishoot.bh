// Package app holds the files service's use cases. It depends on a record repository and an object store, never on
// HTTP or SQL directly.
package app

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"

	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/objectstore"
	"platform.local/backend/services/files/internal/domain"
)

// Repository stores file records.
type Repository interface {
	Insert(ctx context.Context, f domain.File) (domain.File, error)
	Get(ctx context.Context, url string) (domain.File, error)
	List(ctx context.Context, urls []string) ([]domain.File, error)
	Claim(ctx context.Context, url, owner string, now time.Time) (domain.File, error)
	Delete(ctx context.Context, url string) (bool, error)
	WithExpired(ctx context.Context, now time.Time, limit int32, fn func([]domain.File) error) (int, error)
}

// Options are the service's limits and bucket names (from settings).
type Options struct {
	PublicBucket  string
	PrivateBucket string
	MaxFileSize   int64
	UploadTTL     time.Duration
	LookupLimit   int
	CleanupBatch  int32
}

// Service implements the use cases.
type Service struct {
	repo    Repository
	objects objectstore.Store
	opts    Options
	now     func() time.Time
}

// New returns the service.
func New(repo Repository, objects objectstore.Store, opts Options) *Service {
	return &Service{repo: repo, objects: objects, opts: opts, now: time.Now}
}

// MaxFileSize is the largest file the service accepts, in bytes.
func (s *Service) MaxFileSize() int64 { return s.opts.MaxFileSize }

// RegisterInput describes an upload a signed-in user is about to send.
type RegisterInput struct {
	OwnerID  string
	Folder   string
	FileName string
	MIMEType string
	Size     int64
}

// Register reserves an address for an upload. The upload expires unless it is claimed within the upload lifetime.
func (s *Service) Register(ctx context.Context, in RegisterInput) (domain.File, error) {
	if in.OwnerID == "" {
		return domain.File{}, domain.ErrNotOwner
	}
	if err := s.checkSize(in.Size); err != nil {
		return domain.File{}, err
	}
	loc, err := domain.NewLocation(in.Folder, in.FileName, in.MIMEType)
	if err != nil {
		return domain.File{}, err
	}
	now := s.now()
	return s.repo.Insert(ctx, domain.File{
		ID: uuid.NewString(), URL: loc.URL(), OwnerID: in.OwnerID, FileName: domain.CleanFileName(in.FileName),
		Size: in.Size, MIMEType: in.MIMEType, Public: loc.Folder.Public, ExpiresAt: now.Add(s.opts.UploadTTL),
	})
}

// WriteUpload stores the bytes of a registered upload. They must have exactly the registered size and type.
// declaredLength is the request's Content-Length, or -1 when unknown.
func (s *Service) WriteUpload(ctx context.Context, url, owner string, body io.Reader, declaredLength int64) (domain.File, error) {
	f, err := s.repo.Get(ctx, url)
	if err != nil {
		return domain.File{}, err
	}
	if err := f.Claimable(owner, s.now()); err != nil {
		return domain.File{}, err
	}
	if declaredLength >= 0 && declaredLength != f.Size {
		return domain.File{}, domain.ErrContentMismatch
	}
	loc, err := domain.ParseURL(f.URL)
	if err != nil {
		return domain.File{}, err
	}
	content, err := checkedContent(body, f.Size, f.MIMEType)
	if err != nil {
		return domain.File{}, err
	}
	if err := s.objects.Put(ctx, s.bucket(f.Public), loc.Key(), content, f.Size, f.MIMEType); err != nil {
		if errors.Is(err, errSize) {
			return domain.File{}, domain.ErrContentMismatch
		}
		return domain.File{}, err
	}
	return f, nil
}

// Verify checks that an upload is still the owner's to claim and that its stored bytes are intact.
func (s *Service) Verify(ctx context.Context, url, owner string) (domain.File, error) {
	f, err := s.repo.Get(ctx, url)
	if err != nil {
		return domain.File{}, err
	}
	if err := f.Claimable(owner, s.now()); err != nil {
		return domain.File{}, err
	}
	return f, s.checkStored(ctx, f)
}

// Claim verifies an upload and marks it permanent. requirePrivate refuses public (brand) files.
func (s *Service) Claim(ctx context.Context, url, owner string, requirePrivate bool) (domain.File, error) {
	f, err := s.Verify(ctx, url, owner)
	if err != nil {
		return domain.File{}, err
	}
	if requirePrivate && f.Public {
		return domain.File{}, domain.ErrNotPrivate
	}
	return s.repo.Claim(ctx, url, owner, s.now())
}

// Lookup returns the records of the given addresses that exist.
func (s *Service) Lookup(ctx context.Context, urls []string) ([]domain.File, error) {
	if len(urls) == 0 || len(urls) > s.opts.LookupLimit {
		return nil, fmt.Errorf("%w: ask for 1 to %d files", domain.ErrInvalidURL, s.opts.LookupLimit)
	}
	return s.repo.List(ctx, urls)
}

// Open returns a stored file's bytes and record; the caller closes the reader.
func (s *Service) Open(ctx context.Context, url string) (io.ReadCloser, domain.File, error) {
	f, err := s.repo.Get(ctx, url)
	if err != nil {
		return nil, domain.File{}, err
	}
	loc, err := domain.ParseURL(f.URL)
	if err != nil {
		return nil, domain.File{}, err
	}
	body, _, err := s.objects.Get(ctx, s.bucket(f.Public), loc.Key())
	if errors.Is(err, objectstore.ErrNotFound) {
		return nil, domain.File{}, domain.ErrNotFound
	}
	if err != nil {
		return nil, domain.File{}, err
	}
	return body, f, nil
}

// StoreInput describes a file the platform stores itself (seed data, generated documents, website visitors'
// attachments). It is claimed immediately. Give either URL (a chosen address) or Folder and NamePrefix (the address
// is generated from the file's detected type).
type StoreInput struct {
	URL        string
	Folder     string
	NamePrefix string
	OwnerID    string
	FileName   string
	Size       int64
	Body       io.Reader
}

// Store saves a file; its bytes must be of a type the address (or folder) accepts.
func (s *Service) Store(ctx context.Context, in StoreInput) (domain.File, error) {
	if err := s.checkSize(in.Size); err != nil {
		return domain.File{}, err
	}
	head := make([]byte, min(int64(domain.SniffLength), in.Size))
	if _, err := io.ReadFull(in.Body, head); err != nil {
		return domain.File{}, domain.ErrContentMismatch
	}
	loc, err := storeLocation(in, domain.DetectType(head))
	if err != nil {
		return domain.File{}, err
	}
	content, err := checkedContent(io.MultiReader(bytes.NewReader(head), in.Body), in.Size, loc.Type.MIME)
	if err != nil {
		return domain.File{}, err
	}
	now := s.now()
	name := domain.CleanFileName(in.FileName)
	if name == "" {
		name = loc.Name
	}
	f, err := s.repo.Insert(ctx, domain.File{
		ID: uuid.NewString(), URL: loc.URL(), OwnerID: in.OwnerID, FileName: name, Size: in.Size,
		MIMEType: loc.Type.MIME, Public: loc.Folder.Public, ClaimedAt: &now, ExpiresAt: now,
	})
	if err != nil {
		return domain.File{}, err
	}
	if err := s.objects.Put(ctx, s.bucket(f.Public), loc.Key(), content, f.Size, f.MIMEType); err != nil {
		_, _ = s.repo.Delete(context.WithoutCancel(ctx), f.URL)
		if errors.Is(err, errSize) {
			return domain.File{}, domain.ErrContentMismatch
		}
		return domain.File{}, err
	}
	return f, nil
}

func storeLocation(in StoreInput, detected string) (domain.Location, error) {
	if in.URL != "" {
		return domain.ParseURL(in.URL)
	}
	if detected == "" {
		return domain.Location{}, domain.ErrTypeNotAllowed
	}
	return domain.GeneratedLocation(in.Folder, in.NamePrefix, detected)
}

// Delete removes a file's bytes and record.
func (s *Service) Delete(ctx context.Context, url string) error {
	f, err := s.repo.Get(ctx, url)
	if err != nil {
		return err
	}
	if err := s.objects.Delete(ctx, s.bucket(f.Public), objectKey(f.URL)); err != nil {
		return err
	}
	_, err = s.repo.Delete(ctx, url)
	return err
}

// CleanupExpired deletes one batch of uploads that expired unclaimed and returns how many it removed. Bytes are
// deleted before the records, so a failure leaves records to retry rather than orphaned bytes.
func (s *Service) CleanupExpired(ctx context.Context) (int, error) {
	return s.repo.WithExpired(ctx, s.now(), s.opts.CleanupBatch, func(files []domain.File) error {
		for _, f := range files {
			if err := s.objects.Delete(ctx, s.bucket(f.Public), objectKey(f.URL)); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Service) checkSize(size int64) error {
	if size <= 0 {
		return fmt.Errorf("%w: empty file", domain.ErrContentMismatch)
	}
	if size > s.opts.MaxFileSize {
		return domain.ErrTooLarge
	}
	return nil
}

func (s *Service) checkStored(ctx context.Context, f domain.File) error {
	bucket, key := s.bucket(f.Public), objectKey(f.URL)
	info, err := s.objects.Head(ctx, bucket, key)
	if errors.Is(err, objectstore.ErrNotFound) {
		return domain.ErrContentMismatch
	}
	if err != nil {
		return err
	}
	if info.Size != f.Size {
		return domain.ErrContentMismatch
	}
	head, err := s.objects.GetRange(ctx, bucket, key, int64(domain.SniffLength))
	if err != nil {
		return err
	}
	if domain.DetectType(head) != f.MIMEType {
		return domain.ErrContentMismatch
	}
	return nil
}

func (s *Service) bucket(public bool) string {
	if public {
		return s.opts.PublicBucket
	}
	return s.opts.PrivateBucket
}

// objectKey is the object's key for a record. Records always hold addresses that passed ParseURL when written.
func objectKey(url string) string { return strings.TrimPrefix(url, catalog.Files.URLPrefix) }

var errSize = errors.New("content length differs from the declared size")

// checkedContent checks the first bytes' real type and returns a reader that fails if the body is not exactly size
// bytes long.
func checkedContent(body io.Reader, size int64, mime string) (io.Reader, error) {
	head := make([]byte, min(int64(domain.SniffLength), size))
	if _, err := io.ReadFull(body, head); err != nil {
		return nil, domain.ErrContentMismatch
	}
	if domain.DetectType(head) != mime {
		return nil, domain.ErrContentMismatch
	}
	return &exactReader{r: io.MultiReader(bytes.NewReader(head), body), remaining: size}, nil
}

type exactReader struct {
	r         io.Reader
	remaining int64
}

func (e *exactReader) Read(p []byte) (int, error) {
	if e.remaining <= 0 {
		var probe [1]byte
		if n, _ := e.r.Read(probe[:]); n > 0 {
			return 0, errSize
		}
		return 0, io.EOF
	}
	if int64(len(p)) > e.remaining {
		p = p[:e.remaining]
	}
	n, err := e.r.Read(p)
	e.remaining -= int64(n)
	if errors.Is(err, io.EOF) && e.remaining > 0 {
		return n, errSize
	}
	if errors.Is(err, io.EOF) {
		err = nil
	}
	return n, err
}
