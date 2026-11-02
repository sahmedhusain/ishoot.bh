// Command whatsapp-sandbox stands in for the WhatsApp Cloud API in local development (docs/backend/OPERATIONS.md).
// Point NOTIFY_WHATSAPP_URL at it; open it in a browser to read what was sent.
//
//	whatsapp-sandbox             serve on :8080 (SANDBOX_ADDR)
//	whatsapp-sandbox healthcheck probe the running sandbox (Docker HEALTHCHECK)
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "whatsapp-sandbox:", err)
		os.Exit(1)
	}
}

func run() error {
	addr := os.Getenv("SANDBOX_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		return probe(addr)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	server := &http.Server{Addr: addr, Handler: New(1000).Handler(), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	slog.Info("whatsapp sandbox listening", "addr", addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// probe asks this container's own sandbox whether it is up.
func probe(addr string) error {
	_, port, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("SANDBOX_ADDR: %w", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://127.0.0.1:"+port+"/healthz", nil) //nolint:gosec // loopback probe
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req) //nolint:gosec // the loopback address of this container, not user input
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("not ready: %d", resp.StatusCode)
	}
	return nil
}
