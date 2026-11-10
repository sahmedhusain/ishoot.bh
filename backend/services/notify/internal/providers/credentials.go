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
type Credentials map[string]string
type CredentialSource interface {
	Credentials(ctx context.Context, provider string) (Credentials, error)
}
type Static map[string]Credentials
func (s Static) Credentials(_ context.Context, provider string) (Credentials, error) {
	c, ok := s[provider]
	if !ok {
		return nil, Permanent("no credentials for %s", provider)
	}
	return c, nil
}
type SystemCredentials struct {
	BaseURL	string
	Client	*http.Client
}
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
		IsActive	bool			`json:"isActive"`
		Credentials	map[string]string	`json:"credentials"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if !out.IsActive {
		return nil, Permanent("the %s integration is switched off (IT dashboard → Integrations)", provider)
	}
	return out.Credentials, nil
}
