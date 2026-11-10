package providers_test
import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/services/notify/internal/providers"
)
func TestWhatsApp(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v21.0/123/messages" || r.Header.Get("Authorization") != "Bearer tok" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		_, _ = w.Write([]byte(`{"messages":[{"id":"wamid.1"}]}`))
	}))
	defer server.Close()
	sender := providers.WhatsApp{BaseURL: server.URL + "/v21.0", Client: server.Client(),
		Credentials:	providers.Static{"whatsapp": {"phoneId": "123", "token": "tok"}}}
	result, err := sender.Send(context.Background(), providers.Message{ID: "m", To: "97333000001", Text: "hi"})
	require.NoError(t, err)
	assert.Equal(t, "wamid.1", result.ProviderID)
	wrong := providers.WhatsApp{BaseURL: server.URL + "/v21.0", Client: server.Client(),
		Credentials:	providers.Static{"whatsapp": {"phoneId": "123", "token": "bad"}}}
	_, err = wrong.Send(context.Background(), providers.Message{ID: "m", To: "97333000001", Text: "hi"})
	assert.True(t, providers.IsPermanent(err), "a refused token needs IT, not a retry")
}
