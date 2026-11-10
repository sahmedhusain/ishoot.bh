package filesclient
import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"platform.local/backend/services/system/internal/app"
)
type Client struct {
	base	string
	client	*http.Client
}
func New(base string, transport http.RoundTripper) *Client {
	return &Client{base: strings.TrimRight(base, "/"), client: &http.Client{Transport: transport, Timeout: 3 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
}
func (c *Client) Lookup(ctx context.Context, fileURL string) (app.CompanyFile, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.base+"/v1/files/records?"+url.Values{"fileUrl": {fileURL}}.Encode(), nil)
	if err != nil {
		return app.CompanyFile{}, err
	}
	response, err := c.client.Do(req)
	if err != nil {
		return app.CompanyFile{}, app.ErrFileLookupUnavailable
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return app.CompanyFile{}, app.ErrFileLookupUnavailable
	}
	var result struct {
		Items []struct {
			FileURL		string		`json:"fileUrl"`
			MIME		string		`json:"mimeType"`
			Size		int64		`json:"fileSize"`
			Public		bool		`json:"isPublic"`
			ExpiresAt	*time.Time	`json:"expiresAt"`
		} `json:"items"`
	}
	raw, err := io.ReadAll(io.LimitReader(response.Body, 65537))
	if err != nil || len(raw) > 65536 {
		return app.CompanyFile{}, app.ErrFileLookupUnavailable
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return app.CompanyFile{}, app.ErrFileLookupUnavailable
	}
	if len(result.Items) != 1 || result.Items[0].FileURL != fileURL {
		return app.CompanyFile{}, errors.Join(app.ErrValidationFailed, errors.New("uploaded file missing"))
	}
	file := result.Items[0]
	return app.CompanyFile{URL: file.FileURL, MIME: file.MIME, Size: file.Size, Public: file.Public, ExpiresAt: file.ExpiresAt}, nil
}
