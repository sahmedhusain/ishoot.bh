package main

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var serviceName = regexp.MustCompile(`^[a-z][a-z0-9_]{0,40}$`)

// Role is one service's database login and the schema it owns.
type Role struct {
	Service string // also the schema name (ADR 0002)
	// Password of the login; rotated on every run, so changing the secret and re-running is the rotation.
	Password string
	// StatementTimeout and IdleInTransactionTimeout are the role's defaults, so they hold behind PgBouncer too.
	StatementTimeout         time.Duration
	IdleInTransactionTimeout time.Duration
	// ConnectionLimit caps the role's connections to Postgres (-1: none).
	ConnectionLimit int
}

// Login is the role's name: svc_<service>.
func (r Role) Login() string { return "svc_" + r.Service }

// lockKey serialises concurrent runs (several migrate jobs starting at once).
const lockKey = 7_365_201_011

// Apply makes each role exist with its password and defaults, own its schema and everything in it, and nothing
// else. It is idempotent: run it before every migration. Objects someone else created in the schema (a Prisma
// hand-off moving a table in, an earlier install that used one login for everything) are handed to the role.
func Apply(ctx context.Context, pool *pgxpool.Pool, roles []Role, logger *slog.Logger) error {
	for _, r := range roles {
		if !serviceName.MatchString(r.Service) {
			return fmt.Errorf("db-roles: invalid service name %q", r.Service)
		}
		if len(r.Password) < 16 {
			return fmt.Errorf("db-roles: the password for %s needs at least 16 characters", r.Login())
		}
	}
	return pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", lockKey); err != nil {
			return err
		}
		for _, r := range roles {
			if err := apply(ctx, tx, r); err != nil {
				return fmt.Errorf("db-roles: %s: %w", r.Login(), err)
			}
			logger.Info("database role ready", "role", r.Login(), "schema", r.Service)
		}
		return nil
	})
}

func apply(ctx context.Context, tx pgx.Tx, r Role) error {
	login, schema := pgx.Identifier{r.Login()}.Sanitize(), pgx.Identifier{r.Service}.Sanitize()
	var exists bool
	if err := tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1)", r.Login()).Scan(&exists); err != nil {
		return err
	}
	verb := "ALTER"
	if !exists {
		verb = "CREATE"
	}
	// The password cannot be a bind parameter in a role statement; format(%L) quotes it on the server.
	var stmt string
	if err := tx.QueryRow(ctx, `SELECT format('%s ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION CONNECTION LIMIT %s PASSWORD %L',
		$1::text, $2::text, $3::int, $4::text)`, verb, r.Login(), r.ConnectionLimit, r.Password).Scan(&stmt); err != nil {
		return err
	}
	statements := []string{
		stmt,
		fmt.Sprintf("ALTER ROLE %s SET statement_timeout = '%dms'", login, r.StatementTimeout.Milliseconds()),
		fmt.Sprintf("ALTER ROLE %s SET idle_in_transaction_session_timeout = '%dms'", login, r.IdleInTransactionTimeout.Milliseconds()),
		fmt.Sprintf("ALTER ROLE %s SET search_path = %s", login, schema),
		"SELECT format('GRANT CONNECT ON DATABASE %I TO " + login + "', current_database())",
		"CREATE SCHEMA IF NOT EXISTS " + schema + " AUTHORIZATION " + login,
		"ALTER SCHEMA " + schema + " OWNER TO " + login,
	}
	for _, s := range statements {
		if len(s) > 6 && s[:6] == "SELECT" {
			var grant string
			if err := tx.QueryRow(ctx, s).Scan(&grant); err != nil {
				return err
			}
			s = grant
		}
		if _, err := tx.Exec(ctx, s); err != nil {
			return err
		}
	}
	// Hand every object in the schema to the role. Sequences owned by a column follow their table.
	rows, err := tx.Query(ctx, `
SELECT format('ALTER %s %I.%I OWNER TO %I', CASE c.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW'
         WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END, n.nspname, c.relname, $2::text)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = $1 AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
   AND NOT (c.relkind = 'S' AND EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('a', 'i')))
   AND pg_get_userbyid(c.relowner) <> $2
UNION ALL
SELECT format('ALTER %s %s OWNER TO %I', CASE p.prokind WHEN 'p' THEN 'PROCEDURE' WHEN 'a' THEN 'AGGREGATE' ELSE 'FUNCTION' END,
         p.oid::regprocedure, $2::text)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = $1 AND pg_get_userbyid(p.proowner) <> $2
UNION ALL
SELECT format('ALTER TYPE %I.%I OWNER TO %I', n.nspname, t.typname, $2::text)
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
 WHERE n.nspname = $1 AND t.typtype IN ('e', 'd', 'c', 'r', 'm') AND t.typelem = 0
   AND NOT (t.typtype = 'c' AND EXISTS (SELECT 1 FROM pg_class c WHERE c.oid = t.typrelid AND c.relkind <> 'c'))
   AND pg_get_userbyid(t.typowner) <> $2`, r.Service, r.Login())
	if err != nil {
		return err
	}
	alters, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return err
	}
	for _, s := range alters {
		if _, err := tx.Exec(ctx, s); err != nil {
			return fmt.Errorf("%s: %w", s, err)
		}
	}
	return nil
}
