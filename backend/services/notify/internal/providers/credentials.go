package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Credentials of an integration, as IT saved them in the system service.
type Credentials map[string]string

// CredentialSource returns a provider's credentials.
type CredentialSource interface {
	Credentials(ctx context.Context, provider string) (Credentials, error)
}

// Static is a fixed source (local development, the WhatsApp sandbox).
type Static map[string]Credentials

// Credentials returns the fixed credentials.
func (s Static) Credentials(_ context.Context, provider string) (Credentials, error) {
	c, ok := s[provider]
	if !ok {
		return nil, Permanent("no credentials for %s", provider)
	}
	return c, nil
}

// SystemCredentials reads integration settings from the system service with this service's own token
// (authn.ServiceSigner.Transport). An integration that is missing or switched off is a permanent failure: IT fixes it
// in the IT dashboard and retries the message.
type SystemCredentials struct {
	BaseURL string
	Client  *http.Client
}

// Credentials returns the provider's decrypted credentials when the integration is on.
func (s SystemCredentials) Credentials(ctx context.Context, provider string) (Credentials, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.BaseURL+"/v1/system/integrations/"+url.PathEscape(provider), nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("system service: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	switch {
	case resp.StatusCode == http.StatusNotFound:
		return nil, Permanent("the %s integration is not set up (IT dashboard → Integrations)", provider)
	case resp.StatusCode != http.StatusOK:
		return nil, fmt.Errorf("system service answered %d", resp.StatusCode)
	}
	var out struct {
		IsActive    bool              `json:"isActive"`
		Credentials map[string]string `json:"credentials"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if !out.IsActive {
		return nil, Permanent("the %s integration is switched off (IT dashboard → Integrations)", provider)
	}
	return out.Credentials, nil
}
