package systemclient
import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"platform.local/backend/pkg/catalog"
)
type Client struct {
	baseURL	string
	client	*http.Client
}
func New(baseURL string, transport http.RoundTripper) *Client {
	return &Client{baseURL: strings.TrimRight(baseURL, "/"), client: &http.Client{
		Transport:	transport, Timeout: 5 * time.Second,
		CheckRedirect:	func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse },
	}}
}
func (s *Client) Load(ctx context.Context) (map[string]bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/v1/system/modules", nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("system modules answered %d", resp.StatusCode)
	}
	const maxBody = 1 << 20
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBody+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxBody {
		return nil, errors.New("system modules response too large")
	}
	var out struct {
		Items []struct {
			Key	string	`json:"key"`
			Enabled	*bool	`json:"enabled"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	modules := make(map[string]bool, len(out.Items))
	for _, item := range out.Items {
		if _, duplicate := modules[item.Key]; duplicate || item.Key == "" || item.Enabled == nil {
			return nil, errors.New("invalid system module entry")
		}
		modules[item.Key] = *item.Enabled
	}
	for _, module := range catalog.Modules {
		if _, present := modules[module.Key]; !present {
			return nil, errors.New("incomplete system module response")
		}
	}
	return modules, nil
}
type SignInConfiguration struct {
	Active		bool			`json:"active"`
	Values		map[string]string	`json:"values"`
	WebsiteDomain	string			`json:"websiteDomain"`
}
func (s *Client) SignIn(ctx context.Context, provider string) (SignInConfiguration, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if provider != "google" && provider != "apple" {
		return SignInConfiguration{}, errors.New("unsupported sign-in provider")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/v1/system/sign-in/"+provider, nil)
	if err != nil {
		return SignInConfiguration{}, err
	}
	response, err := s.client.Do(req)
	if err != nil {
		return SignInConfiguration{}, err
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusOK {
		return SignInConfiguration{}, fmt.Errorf("system sign-in configuration answered %d", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, (1<<20)+1))
	if err != nil || len(body) > 1<<20 {
		return SignInConfiguration{}, errors.New("invalid sign-in configuration response")
	}
	var result SignInConfiguration
	if err := json.Unmarshal(body, &result); err != nil {
		return SignInConfiguration{}, err
	}
	if result.Values == nil {
		return SignInConfiguration{}, errors.New("missing sign-in configuration")
	}
	return result, nil
}
