package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/realtime/internal/app"
	"platform.local/backend/services/realtime/internal/hub"
)

// Control events the stream itself sends; everything else is a hint from NATS, written as it came.
const (
	EventReady     = "realtime.ready"
	EventReconnect = "realtime.reconnect"
	EventClosed    = "realtime.closed"
)

// stream holds a Server-Sent Events stream open for one person: a ready event, then every hint for them, their
// topics and their realm's statuses, with a heartbeat comment so proxies keep it open. After MaxStreamAge the server
// asks the browser to reconnect, which signs the person in again. Every event is one JSON object on a data line, so
// browsers read them all with onmessage.
func (h *handler) stream(c echo.Context, u user, session string, topics []string) error {
	topics = append(slices.Clone(topics), app.PresenceTopic(u.realm))
	slices.Sort(topics)
	topics = slices.Compact(topics)
	conn := hub.NewConn(uuid.NewString(), u.realm, u.id, session, topics, h.opts.Buffer)
	first, ok := h.hub.Add(conn)
	if !ok {
		return problem.New(http.StatusTooManyRequests, CodeTooManyStreams, "close other tabs or windows")
	}
	h.streams.Inc()
	ctx := c.Request().Context()
	defer func() {
		h.streams.Dec()
		if h.hub.Remove(conn) {
			// The request is over; record the disconnection even though its context ended.
			bg, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
			defer cancel()
			if err := h.svc.Disconnected(bg, u.realm, u.id); err != nil {
				h.opts.Logger.WarnContext(bg, "recording a disconnection", "error", err)
			}
		}
	}()
	if err := h.svc.Connected(ctx, u.realm, u.id, first); err != nil {
		h.opts.Logger.WarnContext(ctx, "recording a connection", "error", err)
	}

	w := c.Response()
	if err := httpx.KeepStreaming(w); err != nil {
		h.opts.Logger.WarnContext(ctx, "stream keeps the write timeout", "error", err)
	}
	header := w.Header()
	header.Set(echo.HeaderContentType, "text/event-stream; charset=utf-8")
	header.Set(echo.HeaderCacheControl, "no-cache, no-transform")
	header.Set("X-Accel-Buffering", "no") // nginx-style proxies must not buffer the stream
	w.WriteHeader(http.StatusOK)

	write := func(text string) bool {
		if _, err := w.Write([]byte(text)); err != nil {
			return false
		}
		w.Flush()
		return true
	}
	control := func(kind string, data any) bool {
		body, _ := json.Marshal(map[string]any{"type": kind, "data": data})
		return write("data: " + string(body) + "\n\n")
	}
	if !write(fmt.Sprintf("retry: %d\n\n", h.opts.Retry.Milliseconds())) ||
		!control(EventReady, map[string]any{"connection": conn.ID, "topics": topics, "heartbeat": int(h.opts.Heartbeat.Seconds())}) {
		return nil
	}

	heartbeat := time.NewTicker(h.opts.Heartbeat)
	defer heartbeat.Stop()
	maxAge := time.NewTimer(h.opts.MaxStreamAge)
	defer maxAge.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-conn.Closed():
			control(EventClosed, map[string]string{"reason": conn.Reason()})
			return nil
		case <-maxAge.C:
			control(EventReconnect, map[string]string{})
			return nil
		case msg := <-conn.Send():
			if !write("data: " + string(msg) + "\n\n") {
				return nil
			}
		case <-heartbeat.C:
			if !write(": ping\n\n") {
				return nil
			}
		}
	}
}
