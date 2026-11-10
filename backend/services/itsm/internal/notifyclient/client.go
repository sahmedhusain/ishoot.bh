package notifyclient
import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)
type InAppNotification struct {
	Realm		string	`json:"realm"`
	Recipient	string	`json:"recipient"`
	Category	string	`json:"category,omitempty"`
	Priority	string	`json:"priority,omitempty"`
	Title		string	`json:"title"`
	Body		string	`json:"body,omitempty"`
	ActionURL	string	`json:"actionUrl,omitempty"`
	EntityType	string	`json:"entityType,omitempty"`
	EntityID	string	`json:"entityId,omitempty"`
	ActorID		string	`json:"actorId,omitempty"`
	DedupeKey	string	`json:"dedupeKey,omitempty"`
}
type Client struct {
	baseURL	string
	client	*http.Client
}
func New(baseURL string, transport http.RoundTripper) *Client {
	if transport == nil {
		transport = http.DefaultTransport
	}
	return &Client{
		baseURL:	strings.TrimRight(baseURL, "/"),
		client: &http.Client{
			Transport:	transport,
			Timeout:	5 * time.Second,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}
func (c *Client) QueueEmail(ctx context.Context, to, subject, text, html, idempotencyKey, actorID string) error {
	if c == nil || c.baseURL == "" {
		return nil
	}
	payload := map[string]any{
		"channel":		"email",
		"to":			to,
		"subject":		subject,
		"text":			text,
		"idempotencyKey":	idempotencyKey,
	}
	if html != "" {
		payload["html"] = html
	}
	if actorID != "" {
		payload["actorId"] = actorID
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/notify/messages", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("notify messages answered status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}
func (c *Client) DeliverInApp(ctx context.Context, items []InAppNotification) error {
	if c == nil || c.baseURL == "" || len(items) == 0 {
		return nil
	}
	payload := map[string]any{"items": items}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/notify/inbox", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("notify inbox answered status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}
var ErrUnavailable = errors.New("notify service unavailable")
