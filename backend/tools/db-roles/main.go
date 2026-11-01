// Command db-roles gives each backend service its own database login (svc_<service>) that owns the service's schema
// and nothing else (ADR 0002). It runs with the database owner's credentials before the services migrate, on every
// deploy; it is idempotent and also rotates passwords.
//
// Environment:
//
//	DATABASE_URL                       the database owner's connection
//	DB_ROLES                           services, comma-separated (files,identity,system,itsm)
//	DB_ROLE_PASSWORD_<SERVICE>         each login's password (at least 16 characters)
//	DB_ROLE_STATEMENT_TIMEOUT          default per-statement limit (15s); _<SERVICE> overrides it
//	DB_ROLE_IDLE_IN_TRANSACTION_TIMEOUT  (60s)
//	DB_ROLE_CONNECTION_LIMIT           per-login Postgres connections (-1: no limit)
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("tool", "db-roles")
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		return // a one-shot job has nothing to probe
	}
	if err := run(logger); err != nil {
		fmt.Fprintln(os.Stderr, "db-roles:", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	roles, err := rolesFromEnv(os.Getenv)
	if err != nil {
		return err
	}
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return errors.New("DATABASE_URL is not set")
	}
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return err
	}
	defer pool.Close()
	return Apply(ctx, pool, roles, logger)
}

func rolesFromEnv(get func(string) string) ([]Role, error) {
	duration := func(name, fallback string) (time.Duration, error) {
		v := get(name)
		if v == "" {
			v = fallback
		}
		d, err := time.ParseDuration(v)
		if err != nil || d <= 0 {
			return 0, fmt.Errorf("%s: invalid duration %q", name, v)
		}
		return d, nil
	}
	statement, err := duration("DB_ROLE_STATEMENT_TIMEOUT", "15s")
	if err != nil {
		return nil, err
	}
	idle, err := duration("DB_ROLE_IDLE_IN_TRANSACTION_TIMEOUT", "60s")
	if err != nil {
		return nil, err
	}
	limit := -1
	if v := get("DB_ROLE_CONNECTION_LIMIT"); v != "" {
		if limit, err = strconv.Atoi(v); err != nil || limit < -1 {
			return nil, fmt.Errorf("DB_ROLE_CONNECTION_LIMIT: invalid %q", v)
		}
	}
	var roles []Role
	for _, service := range strings.Split(get("DB_ROLES"), ",") {
		service = strings.TrimSpace(service)
		if service == "" {
			continue
		}
		upper := strings.ToUpper(service)
		own, err := duration("DB_ROLE_STATEMENT_TIMEOUT_"+upper, statement.String())
		if err != nil {
			return nil, err
		}
		roles = append(roles, Role{Service: service, Password: get("DB_ROLE_PASSWORD_" + upper),
			StatementTimeout: own, IdleInTransactionTimeout: idle, ConnectionLimit: limit})
	}
	if len(roles) == 0 {
		return nil, errors.New("DB_ROLES is empty")
	}
	return roles, nil
}
