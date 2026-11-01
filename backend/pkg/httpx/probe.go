package httpx

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"time"
)

// HealthcheckCommand is the argument that makes a service binary probe its own readiness and exit, for container
// health checks in images that have no shell or curl.
const HealthcheckCommand = "healthcheck"

// Probe calls the admin listener's /readyz on this host and returns an error unless it answers 200.
func Probe(ctx context.Context, adminAddr string, timeout time.Duration) error {
	host, port, err := net.SplitHostPort(adminAddr)
	if err != nil {
		return err
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "127.0.0.1"
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://"+net.JoinHostPort(host, port)+"/readyz", nil)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("readyz answered %d", res.StatusCode)
	}
	return nil
}
