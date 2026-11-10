package providers
import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)
type WhatsApp struct {
	BaseURL		string
	Credentials	CredentialSource
	Client		*http.Client
}
func (w WhatsApp) Send(ctx context.Context, msg Message) (Result, error) {
	creds, err := w.Credentials.Credentials(ctx, "whatsapp")
	if err != nil {
		return Result{}, err
	}
	if creds["phoneId"] == "" || creds["token"] == "" {
		return Result{}, Permanent("the whatsapp integration needs a phone number ID and a token")
	}
	raw, err := json.Marshal(map[string]any{
		"messaging_product":	"whatsapp", "to": msg.To, "type": "text", "text": map[string]string{"body": msg.Text},
	})
	if err != nil {
		return Result{}, err
	}
	endpoint := strings.TrimRight(w.BaseURL, "/") + "/" + url.PathEscape(creds["phoneId"]) + "/messages"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(raw))
	if err != nil {
		return Result{}, err
	}
	req.Header.Set("Authorization", "Bearer "+creds["token"])
	req.Header.Set("Content-Type", "application/json")
	resp, err := w.Client.Do(req)
	if err != nil {
		return Result{}, fmt.Errorf("whatsapp: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode/100 != 2 {
		return Result{}, httpStatusError("whatsapp", resp.StatusCode, string(body))
	}
	var out struct {
		Messages []struct {
			ID string `json:"id"`
		} `json:"messages"`
	}
	if err := json.Unmarshal(body, &out); err != nil || len(out.Messages) == 0 || out.Messages[0].ID == "" {
		return Result{}, fmt.Errorf("whatsapp did not return a message id")
	}
	return Result{Provider: "whatsapp", ProviderID: out.Messages[0].ID}, nil
}
