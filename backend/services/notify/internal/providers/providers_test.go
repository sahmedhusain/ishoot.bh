package providers_test
import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"platform.local/backend/services/notify/internal/providers"
)
func TestSMTP(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test: needs Docker")
	}
	ctx := context.Background()
	mailpit, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:		"axllent/mailpit:v1.27",
			ExposedPorts:	[]string{"1025/tcp", "8025/tcp"},
			WaitingFor:	wait.ForHTTP("/livez").WithPort("8025/tcp"),
		},
		Started:	true,
	})
	require.NoError(t, err)
	t.Cleanup(func() { _ = mailpit.Terminate(context.Background()) })
	host, err := mailpit.Host(ctx)
	require.NoError(t, err)
	smtpPort, err := mailpit.MappedPort(ctx, "1025/tcp")
	require.NoError(t, err)
	apiPort, err := mailpit.MappedPort(ctx, "8025/tcp")
	require.NoError(t, err)
	port, err := strconv.Atoi(smtpPort.Port())
	require.NoError(t, err)
	sender := providers.SMTP{Host: host, Port: port, TLS: "none", From: "Platform <no-reply@example.com>", Timeout: 10 * time.Second}
	result, err := sender.Send(ctx, providers.Message{ID: "7d3f1c2e-5b6a-4c8d-9e0f-1a2b3c4d5e6f", To: "client@example.com",
		Subject:	"Your quotation — العرض", Text: "Hello", HTML: "<p>Hello</p>",
		Attachments:	[]providers.Attachment{{Filename: "quote.pdf", ContentType: "application/pdf", Content: []byte("%PDF-1.4 test")}}})
	require.NoError(t, err)
	assert.Equal(t, "smtp", result.Provider)
	resp, err := http.Get("http://" + host + ":" + apiPort.Port() + "/api/v1/messages")
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	var list struct {
		Messages []struct {
			Subject		string
			Attachments	int
			To		[]struct{ Address string }
		}
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&list))
	require.Len(t, list.Messages, 1)
	assert.Equal(t, "Your quotation — العرض", list.Messages[0].Subject)
	assert.Equal(t, 1, list.Messages[0].Attachments)
	assert.Equal(t, "client@example.com", list.Messages[0].To[0].Address)
	_, err = sender.Send(ctx, providers.Message{ID: "x", To: "not an address", Subject: "s", Text: "t"})
	assert.True(t, providers.IsPermanent(err))
	_, err = providers.SMTP{Host: host, Port: 1, TLS: "none", From: "a@example.com", Timeout: time.Second}.
		Send(ctx, providers.Message{ID: "x", To: "b@example.com", Subject: "s", Text: "t"})
	require.Error(t, err)
	assert.False(t, providers.IsPermanent(err), "a server that cannot be reached may be back later")
}
func TestResend(t *testing.T) {
	var gotKey, gotAuth string
	var gotBody map[string]any
	status := http.StatusOK
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotKey, gotAuth = r.Header.Get("Idempotency-Key"), r.Header.Get("Authorization")
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(status)
		_, _ = io.WriteString(w, `{"id":"re_123"}`)
	}))
	defer server.Close()
	creds := providers.Static{"resend": {"apiKey": "re_key", "fromEmail": "Co <hi@example.com>"}}
	sender := providers.Resend{BaseURL: server.URL, Credentials: creds, Client: server.Client()}
	msg := providers.Message{ID: "m-1", To: "a@example.com", Subject: "s", HTML: "<b>x</b>",
		Attachments:	[]providers.Attachment{{Filename: "a.pdf", Content: []byte("pdf")}}}
	result, err := sender.Send(context.Background(), msg)
	require.NoError(t, err)
	assert.Equal(t, "re_123", result.ProviderID)
	assert.Equal(t, "m-1", gotKey, "a retried send is not delivered twice")
	assert.Equal(t, "Bearer re_key", gotAuth)
	assert.Equal(t, "Co <hi@example.com>", gotBody["from"])
	for code, permanent := range map[int]bool{422: true, 401: true, 429: false, 500: false} {
		status = code
		_, err := sender.Send(context.Background(), msg)
		require.Error(t, err)
		assert.Equal(t, permanent, providers.IsPermanent(err), code)
	}
	_, err = providers.Resend{BaseURL: server.URL, Credentials: providers.Static{}, Client: server.Client()}.Send(context.Background(), msg)
	assert.True(t, providers.IsPermanent(err), "no credentials: IT has to set them up")
}
func TestSystemCredentials(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/whatsapp"):
			_, _ = io.WriteString(w, `{"isActive":true,"credentials":{"phoneId":"1","token":"t"}}`)
		case strings.HasSuffix(r.URL.Path, "/resend"):
			_, _ = io.WriteString(w, `{"isActive":false,"credentials":{}}`)
		case strings.HasSuffix(r.URL.Path, "/down"):
			w.WriteHeader(http.StatusBadGateway)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()
	source := providers.SystemCredentials{BaseURL: server.URL, Client: server.Client()}
	creds, err := source.Credentials(context.Background(), "whatsapp")
	require.NoError(t, err)
	assert.Equal(t, "1", creds["phoneId"])
	_, err = source.Credentials(context.Background(), "resend")
	assert.True(t, providers.IsPermanent(err), "switched off")
	_, err = source.Credentials(context.Background(), "meta")
	assert.True(t, providers.IsPermanent(err), "not set up")
	_, err = source.Credentials(context.Background(), "down")
	assert.False(t, providers.IsPermanent(err), "the system service may be back soon")
}
