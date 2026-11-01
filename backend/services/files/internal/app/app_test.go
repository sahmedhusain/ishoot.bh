package app

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/services/files/internal/domain"
)

var pdf = []byte("%PDF-1.7 a small test document")

type fixture struct {
	svc   *Service
	repo  *memRepo
	store *memStore
	clock time.Time
}

func setup(t *testing.T) *fixture {
	t.Helper()
	f := &fixture{repo: newMemRepo(), store: newMemStore(), clock: time.Date(2026, 11, 1, 10, 0, 0, 0, time.UTC)}
	f.svc = New(f.repo, f.store, Options{
		PublicBucket: "public", PrivateBucket: "private", MaxFileSize: 1024, UploadTTL: time.Hour,
		LookupLimit: 3, CleanupBatch: 10,
	})
	f.svc.now = func() time.Time { return f.clock }
	return f
}

func (f *fixture) upload(t *testing.T, owner, folder, mime string, body []byte) domain.File {
	t.Helper()
	ctx := context.Background()
	file, err := f.svc.Register(ctx, RegisterInput{OwnerID: owner, Folder: folder, FileName: "doc.pdf", MIMEType: mime, Size: int64(len(body))})
	require.NoError(t, err)
	_, err = f.svc.WriteUpload(ctx, file.URL, owner, bytes.NewReader(body), int64(len(body)))
	require.NoError(t, err)
	return file
}

func TestUploadVerifyAndClaim(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	file := f.upload(t, "u1", "general", "application/pdf", pdf)
	assert.True(t, strings.HasPrefix(file.URL, "/api/files/general/"))
	assert.False(t, file.Public)
	assert.Equal(t, f.clock.Add(time.Hour), file.ExpiresAt)

	_, err := f.svc.Verify(ctx, file.URL, "u1")
	require.NoError(t, err)
	_, err = f.svc.Verify(ctx, file.URL, "u2")
	assert.ErrorIs(t, err, domain.ErrNotOwner)

	claimed, err := f.svc.Claim(ctx, file.URL, "u1", true)
	require.NoError(t, err)
	require.NotNil(t, claimed.ClaimedAt)
	_, err = f.svc.Claim(ctx, file.URL, "u1", true)
	assert.ErrorIs(t, err, domain.ErrUnavailable, "an upload is claimed once")
}

func TestRegisterRules(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	tests := map[string]struct {
		in   RegisterInput
		want error
	}{
		"no owner":        {RegisterInput{Folder: "general", MIMEType: "application/pdf", Size: 10}, domain.ErrNotOwner},
		"too large":       {RegisterInput{OwnerID: "u", Folder: "general", MIMEType: "application/pdf", Size: 2048}, domain.ErrTooLarge},
		"empty":           {RegisterInput{OwnerID: "u", Folder: "general", MIMEType: "application/pdf"}, domain.ErrContentMismatch},
		"font in general": {RegisterInput{OwnerID: "u", Folder: "general", MIMEType: "font/woff2", Size: 10}, domain.ErrTypeNotAllowed},
		"unknown folder":  {RegisterInput{OwnerID: "u", Folder: "secret", MIMEType: "application/pdf", Size: 10}, domain.ErrInvalidURL},
		"html":            {RegisterInput{OwnerID: "u", Folder: "general", MIMEType: "text/html", Size: 10}, domain.ErrTypeNotAllowed},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := f.svc.Register(ctx, tc.in)
			assert.ErrorIs(t, err, tc.want)
		})
	}
	brand, err := f.svc.Register(ctx, RegisterInput{OwnerID: "u", Folder: "brand", FileName: "f.woff2", MIMEType: "font/woff2", Size: 10})
	require.NoError(t, err)
	assert.True(t, brand.Public)
}

func TestWriteUploadRejectsWrongContent(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	file, err := f.svc.Register(ctx, RegisterInput{OwnerID: "u1", Folder: "general", FileName: "a.pdf", MIMEType: "application/pdf", Size: int64(len(pdf))})
	require.NoError(t, err)

	_, err = f.svc.WriteUpload(ctx, file.URL, "u1", bytes.NewReader(pdf), int64(len(pdf))+5)
	assert.ErrorIs(t, err, domain.ErrContentMismatch, "declared length differs")
	_, err = f.svc.WriteUpload(ctx, file.URL, "u1", strings.NewReader("<html>pretending to be a pdf</html>"), -1)
	assert.ErrorIs(t, err, domain.ErrContentMismatch, "the real type comes from the bytes")
	_, err = f.svc.WriteUpload(ctx, file.URL, "u1", bytes.NewReader(pdf[:10]), -1)
	assert.ErrorIs(t, err, domain.ErrContentMismatch, "short body")
	_, err = f.svc.WriteUpload(ctx, file.URL, "u2", bytes.NewReader(pdf), -1)
	assert.ErrorIs(t, err, domain.ErrNotOwner)

	_, err = f.svc.Verify(ctx, file.URL, "u1")
	assert.ErrorIs(t, err, domain.ErrContentMismatch, "nothing usable was stored")
}

func TestClaimRules(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	logo := f.upload(t, "u1", "brand", "application/pdf", pdf)
	_, err := f.svc.Claim(ctx, logo.URL, "u1", true)
	assert.ErrorIs(t, err, domain.ErrNotPrivate)
	_, err = f.svc.Claim(ctx, logo.URL, "u1", false)
	require.NoError(t, err)

	late := f.upload(t, "u1", "general", "application/pdf", pdf)
	f.clock = f.clock.Add(2 * time.Hour)
	_, err = f.svc.Claim(ctx, late.URL, "u1", true)
	assert.ErrorIs(t, err, domain.ErrUnavailable)

	_, err = f.svc.Claim(ctx, "/api/files/general/missing.pdf", "u1", true)
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestStoreOpenAndDelete(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	url := "/api/files/general/inquiry_123.pdf"
	file, err := f.svc.Store(ctx, StoreInput{URL: url, FileName: "", Size: int64(len(pdf)), Body: bytes.NewReader(pdf)})
	require.NoError(t, err)
	assert.NotNil(t, file.ClaimedAt, "stored files are permanent")
	assert.Equal(t, "inquiry_123.pdf", file.FileName)

	_, err = f.svc.Store(ctx, StoreInput{URL: url, Size: int64(len(pdf)), Body: bytes.NewReader(pdf)})
	assert.ErrorIs(t, err, domain.ErrExists)
	_, err = f.svc.Store(ctx, StoreInput{URL: "/api/files/general/x.png", Size: int64(len(pdf)), Body: bytes.NewReader(pdf)})
	assert.ErrorIs(t, err, domain.ErrContentMismatch, "a PDF cannot be stored under a .png address")

	body, rec, err := f.svc.Open(ctx, url)
	require.NoError(t, err)
	got, _ := io.ReadAll(body)
	assert.Equal(t, pdf, got)
	assert.Equal(t, "application/pdf", rec.MIMEType)

	require.NoError(t, f.svc.Delete(ctx, url))
	_, _, err = f.svc.Open(ctx, url)
	assert.ErrorIs(t, err, domain.ErrNotFound)
	assert.ErrorIs(t, f.svc.Delete(ctx, url), domain.ErrNotFound)
}

func TestStoreRemovesTheRecordWhenTheBytesFail(t *testing.T) {
	f := setup(t)
	f.store.fail = errors.New("storage down")
	_, err := f.svc.Store(context.Background(), StoreInput{URL: "/api/files/general/a.pdf", Size: int64(len(pdf)), Body: bytes.NewReader(pdf)})
	assert.Error(t, err)
	_, err = f.repo.Get(context.Background(), "/api/files/general/a.pdf")
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestLookup(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	a := f.upload(t, "u1", "general", "application/pdf", pdf)
	files, err := f.svc.Lookup(ctx, []string{a.URL, "/api/files/general/none.pdf"})
	require.NoError(t, err)
	assert.Len(t, files, 1)
	_, err = f.svc.Lookup(ctx, nil)
	assert.Error(t, err)
	_, err = f.svc.Lookup(ctx, []string{"a", "b", "c", "d"})
	assert.Error(t, err, "bounded by the lookup limit")
}

func TestCleanupExpired(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	stale := f.upload(t, "u1", "general", "application/pdf", pdf)
	kept := f.upload(t, "u1", "general", "application/pdf", pdf)
	_, err := f.svc.Claim(ctx, kept.URL, "u1", true)
	require.NoError(t, err)

	f.clock = f.clock.Add(2 * time.Hour)
	removed, err := f.svc.CleanupExpired(ctx)
	require.NoError(t, err)
	assert.Equal(t, 1, removed)
	assert.False(t, f.store.has("private", objectKey(stale.URL)))
	assert.True(t, f.store.has("private", objectKey(kept.URL)))
	_, err = f.repo.Get(ctx, kept.URL)
	assert.NoError(t, err)
}

func TestStoreWithGeneratedName(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	file, err := f.svc.Store(ctx, StoreInput{Folder: "general", NamePrefix: "inquiry", Size: int64(len(pdf)), Body: bytes.NewReader(pdf)})
	require.NoError(t, err)
	assert.True(t, strings.HasPrefix(file.URL, "/api/files/general/inquiry_"))
	assert.True(t, strings.HasSuffix(file.URL, ".pdf"))
	assert.Equal(t, "application/pdf", file.MIMEType)

	_, err = f.svc.Store(ctx, StoreInput{Folder: "general", NamePrefix: "x", Size: 6, Body: strings.NewReader("<html>")})
	assert.ErrorIs(t, err, domain.ErrTypeNotAllowed)
	_, err = f.svc.Store(ctx, StoreInput{Folder: "general", NamePrefix: "../x", Size: int64(len(pdf)), Body: bytes.NewReader(pdf)})
	assert.ErrorIs(t, err, domain.ErrInvalidURL)
}
