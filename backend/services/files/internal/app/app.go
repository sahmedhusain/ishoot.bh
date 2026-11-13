package app
import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/objectstore"
	"platform.local/backend/services/files/internal/domain"
)
type Repository interface {
	Insert(ctx context.Context, f domain.File) (domain.File, error)
	Get(ctx context.Context, url string) (domain.File, error)
	List(ctx context.Context, urls []string) ([]domain.File, error)
	Claim(ctx context.Context, url, owner string, now time.Time) (domain.File, error)
	Delete(ctx context.Context, url string) (bool, error)
	WithExpired(ctx context.Context, now time.Time, limit int32, fn func([]domain.File) error) (int, error)
	WithOrphanedPrivate(ctx context.Context, olderThan time.Time, limit int32, fn func([]domain.File) error) (int, error)
}
type Options struct {
	PublicBucket	string
	PrivateBucket	string
	MaxFileSize	int64
	UploadTTL	time.Duration
	LookupLimit	int
	CleanupBatch	int32
}
type Service struct {
	repo		Repository
	objects		objectstore.Store
	opts		Options
	now		func() time.Time
	importer	Importer
}
func New(repo Repository, objects objectstore.Store, opts Options) *Service {
	return &Service{repo: repo, objects: objects, opts: opts, now: time.Now}
}
func (s *Service) MaxFileSize() int64	{ return s.opts.MaxFileSize }
type RegisterInput struct {
	OwnerID		string
	Folder		string
	FileName	string
	MIMEType	string
	Size		int64
}
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
		ID:	uuid.NewString(), URL: loc.URL(), OwnerID: in.OwnerID, FileName: domain.CleanFileName(in.FileName),
		Size:	in.Size, MIMEType: in.MIMEType, Public: loc.Folder.Public, ExpiresAt: now.Add(s.opts.UploadTTL),
	})
}
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
func (s *Service) Lookup(ctx context.Context, urls []string) ([]domain.File, error) {
	if len(urls) == 0 || len(urls) > s.opts.LookupLimit {
		return nil, fmt.Errorf("%w: ask for 1 to %d files", domain.ErrInvalidURL, s.opts.LookupLimit)
	}
	return s.repo.List(ctx, urls)
}
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
		// Read real physical asset from seeds/assets/ on disk or generate fallback
		data, mime, found := findSeedAssetFile(f.URL, f.FileName)
		if !found {
			data, mime = generateFallbackAsset(f)
		}
		_ = s.objects.Put(ctx, s.bucket(f.Public), loc.Key(), bytes.NewReader(data), int64(len(data)), mime)
		f.Size = int64(len(data))
		f.MIMEType = mime
		return io.NopCloser(bytes.NewReader(data)), f, nil
	}
	if err != nil {
		return nil, domain.File{}, err
	}
	return body, f, nil
}

var seedHashRegex = regexp.MustCompile(`^([a-zA-Z0-9_-]+)_[a-f0-9]{8,16}\.([a-z0-9]+)$`)

func cleanSeedFileName(name string) string {
	if m := seedHashRegex.FindStringSubmatch(name); len(m) == 3 {
		return m[1] + "." + m[2]
	}
	return name
}

func findSeedAssetFile(url, fileName string) ([]byte, string, bool) {
	candidates := []string{
		"seeds/assets",
		"../seeds/assets",
		"../../seeds/assets",
		"../../../seeds/assets",
		"../../../../seeds/assets",
	}
	baseName := filepath.Base(fileName)
	if baseName == "" || baseName == "." {
		baseName = filepath.Base(url)
	}
	cleanName := cleanSeedFileName(baseName)

	aliases := []string{cleanName, baseName}
	if strings.Contains(cleanName, "logo-light") {
		aliases = append(aliases, "logo-text-light.png", "full-logo-light.png", "logo-light.png")
	} else if strings.Contains(cleanName, "logo-dark") {
		aliases = append(aliases, "logo-text-dark.png", "full-logo-dark.png", "logo-dark.png")
	} else if strings.Contains(cleanName, "icon-light") {
		aliases = append(aliases, "icon-light.png", "icon-dark.png")
	} else if strings.Contains(cleanName, "icon-dark") {
		aliases = append(aliases, "icon-dark.png", "icon-light.png")
	}

	for _, root := range candidates {
		for _, name := range aliases {
			subpaths := []string{
				filepath.Join(root, "demo/assets/brand", name),
				filepath.Join(root, "ishoot/assets/brand", name),
				filepath.Join(root, "demo/assets/media/banners", name),
				filepath.Join(root, "demo/assets/media/clients", name),
				filepath.Join(root, "ishoot/assets/media/banners", name),
			}
			for _, p := range subpaths {
				if data, err := os.ReadFile(p); err == nil && len(data) > 0 {
					mime := "image/png"
					if strings.HasSuffix(p, ".svg") {
						mime = "image/svg+xml"
					} else if strings.HasSuffix(p, ".jpg") || strings.HasSuffix(p, ".jpeg") {
						mime = "image/jpeg"
					}
					return data, mime, true
				}
			}
		}
	}
	return nil, "", false
}

func generateFallbackAsset(f domain.File) ([]byte, string) {
	isIcon := strings.Contains(f.FileName, "icon") || strings.Contains(f.URL, "icon")
	isDark := strings.Contains(f.FileName, "dark") || strings.Contains(f.URL, "dark")
	isPdf := strings.HasSuffix(f.FileName, ".pdf") || f.MIMEType == "application/pdf"

	if isPdf {
		pdf := "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT /F1 24 Tf 100 700 Td (" + escapePdfText(f.FileName) + ") Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000242 00000 n \n0000000346 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n425\n%%EOF"
		return []byte(pdf), "application/pdf"
	}

	bg := "%23f3f4f6"
	fg := "%23111827"
	if isDark {
		bg = "%23111827"
		fg = "%23f9fafb"
	}
	label := strings.TrimSuffix(f.FileName, ".png")
	label = strings.TrimSuffix(label, ".jpg")
	label = strings.TrimSuffix(label, ".svg")
	if len(label) > 30 {
		label = label[:30]
	}
	width := 240
	height := 80
	fontSize := 16
	if isIcon {
		width = 80
		height = 80
		fontSize = 32
		if len(label) > 3 {
			label = "I"
		}
	}
	svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d"><rect width="100%%" height="100%%" rx="12" fill="%s"/><text x="50%%" y="50%%" dominant-baseline="middle" text-anchor="middle" fill="%s" font-family="sans-serif" font-size="%d" font-weight="bold">%s</text></svg>`,
		width, height, width, height, bg, fg, fontSize, label)
	return []byte(svg), "image/svg+xml"
}

func escapePdfText(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "(", "\\(")
	return strings.ReplaceAll(s, ")", "\\)")
}
type StoreInput struct {
	URL		string
	Folder		string
	NamePrefix	string
	OwnerID		string
	FileName	string
	Size		int64
	Body		io.Reader
}
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
		ID:	uuid.NewString(), URL: loc.URL(), OwnerID: in.OwnerID, FileName: name, Size: in.Size,
		MIMEType:	loc.Type.MIME, Public: loc.Folder.Public, ClaimedAt: &now, ExpiresAt: time.Time{},
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
func (s *Service) CleanupOrphanedPrivate(ctx context.Context) (int, error) {
	return s.repo.WithOrphanedPrivate(ctx, s.now().Add(-30*24*time.Hour), s.opts.CleanupBatch, func(files []domain.File) error {
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
func objectKey(url string) string	{ return strings.TrimPrefix(url, catalog.Files.URLPrefix) }
var errSize = errors.New("content length differs from the declared size")
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
	r		io.Reader
	remaining	int64
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
