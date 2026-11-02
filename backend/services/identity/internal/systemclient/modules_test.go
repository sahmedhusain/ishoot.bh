package systemclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/catalog"
)

func TestModuleSource(t *testing.T) {
	items := make([]map[string]any, 0, len(catalog.Modules))
	for _, module := range catalog.Modules {
		items = append(items, map[string]any{"key": module.Key, "enabled": module.Key != "store", "nameEn": module.NameEn})
	}
	valid, err := json.Marshal(map[string]any{"items": items})
	require.NoError(t, err)
	for _, tc := range []struct {
		name   string
		status int
		body   string
		ok     bool
	}{
		{"complete", 200, string(valid), true},
		{"upstream failure", 503, string(valid), false},
		{"invalid JSON", 200, "{", false},
		{"empty catalogue", 200, `{"items":[]}`, false},
		{"missing enabled flag", 200, `{"items":[{"key":"store"}]}`, false},
		{"duplicate flag", 200, `{"items":[{"key":"store","enabled":true},{"key":"store","enabled":false}]}`, false},
		{"oversized", 200, strings.Repeat(" ", (1<<20)+1), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, "/v1/system/modules", r.URL.Path)
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()
			modules, err := New(server.URL, nil).Load(context.Background())
			if !tc.ok {
				require.Error(t, err)
				require.Nil(t, modules)
				return
			}
			require.NoError(t, err)
			require.Len(t, modules, len(catalog.Modules))
			require.False(t, modules["store"])
		})
	}
}

func TestModuleSourceRefusesRedirects(t *testing.T) {
	visited := false
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { visited = true }))
	defer target.Close()
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, target.URL, http.StatusFound) }))
	defer source.Close()
	_, err := New(source.URL, nil).Load(context.Background())
	require.Error(t, err)
	require.False(t, visited)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = New(source.URL, nil).Load(ctx)
	require.ErrorIs(t, err, context.Canceled)
}
