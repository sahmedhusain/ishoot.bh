package app

import (
	"bytes"
	"context"
	"errors"
	"io"
	"sort"
	"sync"
	"time"

	"platform.local/backend/pkg/objectstore"
	"platform.local/backend/services/files/internal/domain"
)

type memRepo struct {
	mu    sync.Mutex
	files map[string]domain.File
}

func newMemRepo() *memRepo { return &memRepo{files: map[string]domain.File{}} }

func (m *memRepo) Insert(_ context.Context, f domain.File) (domain.File, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.files[f.URL]; ok {
		return domain.File{}, domain.ErrExists
	}
	m.files[f.URL] = f
	return f, nil
}

func (m *memRepo) Get(_ context.Context, url string) (domain.File, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	f, ok := m.files[url]
	if !ok {
		return domain.File{}, domain.ErrNotFound
	}
	return f, nil
}

func (m *memRepo) List(_ context.Context, urls []string) ([]domain.File, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []domain.File
	for _, u := range urls {
		if f, ok := m.files[u]; ok {
			out = append(out, f)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].URL < out[j].URL })
	return out, nil
}

func (m *memRepo) Claim(_ context.Context, url, owner string, now time.Time) (domain.File, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	f, ok := m.files[url]
	if !ok || f.Claimable(owner, now) != nil {
		return domain.File{}, domain.ErrUnavailable
	}
	f.ClaimedAt = &now
	m.files[url] = f
	return f, nil
}

func (m *memRepo) Delete(_ context.Context, url string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.files[url]
	delete(m.files, url)
	return ok, nil
}

func (m *memRepo) WithExpired(_ context.Context, now time.Time, limit int32, fn func([]domain.File) error) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var batch []domain.File
	for _, f := range m.files {
		if f.ClaimedAt == nil && f.ExpiresAt.Before(now) && int32(len(batch)) < limit {
			batch = append(batch, f)
		}
	}
	if len(batch) == 0 {
		return 0, nil
	}
	if err := fn(batch); err != nil {
		return 0, err
	}
	for _, f := range batch {
		delete(m.files, f.URL)
	}
	return len(batch), nil
}

type memStore struct {
	mu      sync.Mutex
	objects map[string][]byte
	types   map[string]string
	fail    error
}

func newMemStore() *memStore {
	return &memStore{objects: map[string][]byte{}, types: map[string]string{}}
}

func (m *memStore) Put(_ context.Context, bucket, key string, body io.Reader, size int64, contentType string) error {
	if m.fail != nil {
		return m.fail
	}
	b, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	if int64(len(b)) != size {
		return errors.New("short body")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.objects[bucket+"/"+key], m.types[bucket+"/"+key] = b, contentType
	return nil
}

func (m *memStore) Get(_ context.Context, bucket, key string) (io.ReadCloser, objectstore.Info, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	b, ok := m.objects[bucket+"/"+key]
	if !ok {
		return nil, objectstore.Info{}, objectstore.ErrNotFound
	}
	return io.NopCloser(bytes.NewReader(b)), objectstore.Info{Size: int64(len(b)), ContentType: m.types[bucket+"/"+key]}, nil
}

func (m *memStore) GetRange(ctx context.Context, bucket, key string, n int64) ([]byte, error) {
	r, _, err := m.Get(ctx, bucket, key)
	if err != nil {
		return nil, err
	}
	return io.ReadAll(io.LimitReader(r, n))
}

func (m *memStore) Head(_ context.Context, bucket, key string) (objectstore.Info, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	b, ok := m.objects[bucket+"/"+key]
	if !ok {
		return objectstore.Info{}, objectstore.ErrNotFound
	}
	return objectstore.Info{Size: int64(len(b)), ContentType: m.types[bucket+"/"+key]}, nil
}

func (m *memStore) Delete(_ context.Context, bucket, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.objects, bucket+"/"+key)
	return nil
}

func (m *memStore) has(bucket, key string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.objects[bucket+"/"+key]
	return ok
}
