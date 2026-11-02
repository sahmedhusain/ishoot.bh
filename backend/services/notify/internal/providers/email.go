package providers

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"strconv"
	"strings"
	"time"
)

// SMTP sends e-mail through an SMTP server (Mailpit locally, or the company's relay).
type SMTP struct {
	Host     string
	Port     int
	Username string
	Password string
	// TLS is "none", "starttls" or "tls".
	TLS     string
	From    string
	Timeout time.Duration
}

// Send delivers one e-mail.
func (s SMTP) Send(ctx context.Context, msg Message) (Result, error) {
	from, err := mail.ParseAddress(s.From)
	if err != nil {
		return Result{}, Permanent("NOTIFY_EMAIL_FROM: %v", err)
	}
	to, err := mail.ParseAddress(msg.To)
	if err != nil {
		return Result{}, Permanent("recipient: %v", err)
	}
	body, err := buildMIME(from, to, msg, s.Host)
	if err != nil {
		return Result{}, err
	}
	addr := net.JoinHostPort(s.Host, strconv.Itoa(s.Port))
	dialer := net.Dialer{Timeout: s.Timeout}
	var conn net.Conn
	if s.TLS == "tls" {
		tlsDialer := tls.Dialer{NetDialer: &dialer, Config: &tls.Config{ServerName: s.Host, MinVersion: tls.VersionTLS12}}
		conn, err = tlsDialer.DialContext(ctx, "tcp", addr)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return Result{}, fmt.Errorf("smtp: %w", err)
	}
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}
	client, err := smtp.NewClient(conn, s.Host)
	if err != nil {
		_ = conn.Close()
		return Result{}, fmt.Errorf("smtp: %w", err)
	}
	defer func() { _ = client.Close() }()
	if s.TLS == "starttls" {
		if err := client.StartTLS(&tls.Config{ServerName: s.Host, MinVersion: tls.VersionTLS12}); err != nil {
			return Result{}, fmt.Errorf("smtp starttls: %w", err)
		}
	}
	if s.Username != "" {
		if err := client.Auth(smtp.PlainAuth("", s.Username, s.Password, s.Host)); err != nil {
			return Result{}, smtpError(err)
		}
	}
	if err := client.Mail(from.Address); err != nil {
		return Result{}, smtpError(err)
	}
	if err := client.Rcpt(to.Address); err != nil {
		return Result{}, smtpError(err)
	}
	w, err := client.Data()
	if err != nil {
		return Result{}, smtpError(err)
	}
	if _, err := w.Write(body); err != nil {
		return Result{}, smtpError(err)
	}
	if err := w.Close(); err != nil {
		return Result{}, smtpError(err)
	}
	_ = client.Quit()
	return Result{Provider: "smtp", ProviderID: messageID(msg.ID, s.Host)}, nil
}

// smtpError makes a 5xx reply permanent; 4xx replies and connection errors may pass on retry.
func smtpError(err error) error {
	var tp *textproto.Error
	if ok := asTextproto(err, &tp); ok && tp.Code >= 500 {
		return &PermanentError{Err: fmt.Errorf("smtp: %w", err)}
	}
	return fmt.Errorf("smtp: %w", err)
}

func asTextproto(err error, target **textproto.Error) bool {
	if e, ok := err.(*textproto.Error); ok { //nolint:errorlint // net/smtp returns it unwrapped
		*target = e
		return true
	}
	return false
}

func messageID(id, host string) string { return "<" + id + "@" + host + ">" }

// buildMIME writes a multipart message: the text and HTML parts as alternatives, then the attachments.
func buildMIME(from, to *mail.Address, msg Message, host string) ([]byte, error) {
	var buf bytes.Buffer
	mixed := multipart.NewWriter(&buf)
	header := func(k, v string) { fmt.Fprintf(&buf, "%s: %s\r\n", k, v) }
	header("From", from.String())
	header("To", to.String())
	header("Subject", mime.QEncoding.Encode("utf-8", msg.Subject))
	header("Date", time.Now().UTC().Format(time.RFC1123Z))
	header("Message-ID", messageID(msg.ID, host))
	header("MIME-Version", "1.0")
	header("Content-Type", "multipart/mixed; boundary="+mixed.Boundary())
	buf.WriteString("\r\n")

	var alt bytes.Buffer
	alternative := multipart.NewWriter(&alt)
	for _, part := range []struct{ kind, body string }{{"text/plain", msg.Text}, {"text/html", msg.HTML}} {
		if part.body == "" {
			continue
		}
		w, err := alternative.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {part.kind + "; charset=utf-8"},
			"Content-Transfer-Encoding": {"base64"},
		})
		if err != nil {
			return nil, err
		}
		if err := writeBase64(w, []byte(part.body)); err != nil {
			return nil, err
		}
	}
	if err := alternative.Close(); err != nil {
		return nil, err
	}
	w, err := mixed.CreatePart(textproto.MIMEHeader{"Content-Type": {"multipart/alternative; boundary=" + alternative.Boundary()}})
	if err != nil {
		return nil, err
	}
	if _, err := w.Write(alt.Bytes()); err != nil {
		return nil, err
	}
	for _, a := range msg.Attachments {
		w, err := mixed.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {a.ContentType},
			"Content-Transfer-Encoding": {"base64"},
			"Content-Disposition":       {mime.FormatMediaType("attachment", map[string]string{"filename": a.Filename})},
		})
		if err != nil {
			return nil, err
		}
		if err := writeBase64(w, a.Content); err != nil {
			return nil, err
		}
	}
	if err := mixed.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// writeBase64 writes lines of 76 characters, as RFC 2045 requires.
func writeBase64(w io.Writer, data []byte) error {
	encoded := base64.StdEncoding.EncodeToString(data)
	for len(encoded) > 76 {
		if _, err := io.WriteString(w, encoded[:76]+"\r\n"); err != nil {
			return err
		}
		encoded = encoded[76:]
	}
	_, err := io.WriteString(w, encoded+"\r\n")
	return err
}

// Resend sends e-mail through Resend with the credentials IT saved (apiKey, fromEmail). The message ID is the
// idempotency key, so a retried send is not delivered twice.
type Resend struct {
	BaseURL     string
	Credentials CredentialSource
	Client      *http.Client
}

// Send delivers one e-mail.
func (r Resend) Send(ctx context.Context, msg Message) (Result, error) {
	creds, err := r.Credentials.Credentials(ctx, "resend")
	if err != nil {
		return Result{}, err
	}
	if creds["apiKey"] == "" || creds["fromEmail"] == "" {
		return Result{}, Permanent("the resend integration needs an API key and a sender address")
	}
	payload := map[string]any{"from": creds["fromEmail"], "to": []string{msg.To}, "subject": msg.Subject}
	if msg.HTML != "" {
		payload["html"] = msg.HTML
	}
	if msg.Text != "" {
		payload["text"] = msg.Text
	}
	if len(msg.Attachments) > 0 {
		files := make([]map[string]string, len(msg.Attachments))
		for i, a := range msg.Attachments {
			files[i] = map[string]string{"filename": a.Filename, "content": base64.StdEncoding.EncodeToString(a.Content)}
		}
		payload["attachments"] = files
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return Result{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(r.BaseURL, "/")+"/emails", bytes.NewReader(raw))
	if err != nil {
		return Result{}, err
	}
	req.Header.Set("Authorization", "Bearer "+creds["apiKey"])
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", msg.ID)
	resp, err := r.Client.Do(req)
	if err != nil {
		return Result{}, fmt.Errorf("resend: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode/100 != 2 {
		return Result{}, httpStatusError("resend", resp.StatusCode, string(body))
	}
	var out struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &out); err != nil || out.ID == "" {
		return Result{}, fmt.Errorf("resend did not return a message id")
	}
	return Result{Provider: "resend", ProviderID: out.ID}, nil
}
