// Package testkit starts real dependencies (PostgreSQL…) in containers for integration tests. Integration tests are
// skipped with `go test -short`.
package testkit

import (
	"context"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// PostgresImage is the image integration tests run against; keep it in step with docker-compose.yml and CI.
const PostgresImage = "postgres:17-alpine"

// Postgres starts a disposable PostgreSQL server for the test and returns its connection URL.
func Postgres(t testing.TB) string {
	t.Helper()
	if testing.Short() {
		t.Skip("integration test: needs Docker")
	}
	ctx := context.Background()
	container, err := postgres.Run(ctx, PostgresImage,
		postgres.WithDatabase("platform_test"),
		postgres.WithUsername("platform"),
		postgres.WithPassword("platform"),
		testcontainers.WithWaitStrategy(wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).WithStartupTimeout(time.Minute)),
	)
	if err != nil {
		t.Fatalf("testkit: starting postgres: %v", err)
	}
	t.Cleanup(func() { _ = testcontainers.TerminateContainer(container) })
	url, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("testkit: postgres url: %v", err)
	}
	return url
}
