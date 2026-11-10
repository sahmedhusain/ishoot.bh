package main
import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"sync"
	"time"
)
type Message struct {
	ID		string		`json:"id"`
	PhoneID		string		`json:"phoneId"`
	To		string		`json:"to"`
	Type		string		`json:"type"`
	Body		string		`json:"body"`
	ReceivedAt	time.Time	`json:"receivedAt"`
}
type Sandbox struct {
	mu		sync.Mutex
	messages	[]Message
	seq		int
	failNext	int
	failWith	int
	max		int
	now		func() time.Time
}
func New(max int) *Sandbox	{ return &Sandbox{max: max, now: time.Now} }
func (s *Sandbox) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /{version}/{phoneID}/messages", s.send)
	mux.HandleFunc("GET /sandbox/messages", s.list)
	mux.HandleFunc("DELETE /sandbox/messages", s.clear)
	mux.HandleFunc("POST /sandbox/fail", s.arm)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	mux.HandleFunc("GET /{$}", s.page)
	return mux
}
func graphError(w http.ResponseWriter, status, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]any{"message": message, "type": "OAuthException", "code": code}})
}
func (s *Sandbox) send(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") || len(r.Header.Get("Authorization")) < 8 {
		graphError(w, http.StatusUnauthorized, 190, "Invalid OAuth access token.")
		return
	}
	var in struct {
		Product	string	`json:"messaging_product"`
		To	string	`json:"to"`
		Type	string	`json:"type"`
		Text	struct {
			Body string `json:"body"`
		}	`json:"text"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil || in.Product != "whatsapp" || in.To == "" {
		graphError(w, http.StatusBadRequest, 100, "Invalid parameter")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failNext > 0 {
		s.failNext--
		graphError(w, s.failWith, 2, "Sandbox: failure requested")
		return
	}
	switch {
	case strings.HasSuffix(in.To, "0500"):
		graphError(w, http.StatusInternalServerError, 2, "Sandbox: service temporarily unavailable")
		return
	case strings.HasSuffix(in.To, "0429"):
		graphError(w, http.StatusTooManyRequests, 130429, "Sandbox: rate limit hit")
		return
	case strings.HasSuffix(in.To, "0400"):
		graphError(w, http.StatusBadRequest, 131030, "Sandbox: recipient phone number not in allowed list")
		return
	}
	s.seq++
	msg := Message{ID: fmt.Sprintf("wamid.sandbox-%d", s.seq), PhoneID: r.PathValue("phoneID"), To: in.To, Type: in.Type,
		Body:	in.Text.Body, ReceivedAt: s.now().UTC()}
	s.messages = append(s.messages, msg)
	if len(s.messages) > s.max {
		s.messages = s.messages[len(s.messages)-s.max:]
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"messaging_product":	"whatsapp",
		"contacts":		[]map[string]string{{"input": in.To, "wa_id": in.To}},
		"messages":		[]map[string]string{{"id": msg.ID}},
	})
}
func (s *Sandbox) newest(to string) []Message {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []Message{}
	for i := len(s.messages) - 1; i >= 0; i-- {
		if to == "" || s.messages[i].To == to {
			out = append(out, s.messages[i])
		}
	}
	return out
}
func (s *Sandbox) list(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"items": s.newest(r.URL.Query().Get("to"))})
}
func (s *Sandbox) clear(w http.ResponseWriter, _ *http.Request) {
	s.mu.Lock()
	s.messages, s.failNext = nil, 0
	s.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}
func (s *Sandbox) arm(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Count	int	`json:"count"`
		Status	int	`json:"status"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&in); err != nil || in.Count < 0 || in.Count > 100 {
		http.Error(w, "count must be 0 to 100", http.StatusBadRequest)
		return
	}
	if in.Status < 400 || in.Status > 599 {
		in.Status = http.StatusServiceUnavailable
	}
	s.mu.Lock()
	s.failNext, s.failWith = in.Count, in.Status
	s.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}
var pageTemplate = template.Must(template.New("page").Parse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="5"><title>WhatsApp sandbox</title>
<style>body{font:14px system-ui,sans-serif;margin:2rem;color:#1b1b1f}table{border-collapse:collapse;width:100%}
td,th{border-bottom:1px solid #ddd;padding:.4rem;text-align:start;vertical-align:top}td.body{white-space:pre-wrap}</style>
</head><body><h1>WhatsApp sandbox</h1>
<p>Messages the platform sent locally (newest first; nothing leaves this machine). Numbers ending in 0500, 0429 or
0400 fail on purpose. JSON: <code>/sandbox/messages</code>.</p>
<table><tr><th>Received</th><th>To</th><th>Message</th><th>ID</th></tr>
{{range .}}<tr><td>{{.ReceivedAt.Format "2006-01-02 15:04:05"}}</td><td>{{.To}}</td><td class="body">{{.Body}}</td><td>{{.ID}}</td></tr>
{{else}}<tr><td colspan="4">No messages yet.</td></tr>{{end}}</table></body></html>`))
func (s *Sandbox) page(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = pageTemplate.Execute(w, s.newest(""))
}
