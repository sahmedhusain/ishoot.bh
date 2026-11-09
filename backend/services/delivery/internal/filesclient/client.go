package filesclient

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const responseLimit = 65536

type Client struct {
	base   string
	client *http.Client
}

func New(base string, transport http.RoundTripper) *Client {
	return &Client{
		base: strings.TrimRight(base, "/"),
		client: &http.Client{
			Transport: transport,
			Timeout:   5 * time.Second,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

// DeletePrivate removes a private file, and leaves public assets or files still listed as shared alone.
func (c *Client) DeletePrivate(ctx context.Context, fileURL string) error {
	query := url.Values{"fileUrl": {fileURL}}.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.base+"/v1/files/records?"+query, nil)
	if err != nil {
		return err
	}
	response, err := c.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return nil
	}
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("files lookup returned %s", response.Status)
	}
	var result struct {
		Items []struct {
			FileURL  string `json:"fileUrl"`
			IsPublic bool   `json:"isPublic"`
		} `json:"items"`
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, responseLimit+1))
	if err != nil || len(body) > responseLimit {
		return errors.New("invalid files lookup response")
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return errors.New("invalid files lookup response")
	}
	if len(result.Items) == 0 {
		return nil
	}
	if len(result.Items) != 1 || result.Items[0].FileURL != fileURL {
		return errors.New("files lookup returned an unexpected record")
	}
	if result.Items[0].IsPublic {
		return nil
	}

	request, err = http.NewRequestWithContext(ctx, http.MethodDelete, c.base+"/v1/files/content?"+query, nil)
	if err != nil {
		return err
	}
	response, err = c.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusNoContent && response.StatusCode != http.StatusNotFound {
		return fmt.Errorf("files delete returned %s", response.Status)
	}
	return nil
}
