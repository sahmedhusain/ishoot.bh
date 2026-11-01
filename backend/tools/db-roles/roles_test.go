package main

import (
	"context"
	"io"
	"log/slog"
	"net/url"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/system/migrations"
)

func TestRolesFromEnv(t *testing.T) {
	env := map[string]string{"DB_ROLES": "files, system", "DB_ROLE_PASSWORD_FILES": "a", "DB_ROLE_STATEMENT_TIMEOUT_SYSTEM": "5s"}
	roles, err := rolesFromEnv(func(k string) string { return env[k] })
	require.NoError(t, err)
	require.Len(t, roles, 2)
	assert.Equal(t, "svc_files", roles[0].Login())
	assert.Equal(t, 15*time.Second, roles[0].StatementTimeout)
	assert.Equal(t, 5*time.Second, roles[1].StatementTimeout)
	_, err = rolesFromEnv(func(string) string { return "" })
	assert.Error(t, err)
}

func TestApply(t *testing.T) {
	ctx := context.Background()
	adminURL := testkit.Postgres(t)
	admin, err := pgxpool.New(ctx, adminURL)
	require.NoError(t, err)
	t.Cleanup(admin.Close)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	// An existing install: one login made everything, including a table a Prisma hand-off moved into a schema, an
	// enum and a function (as River creates), and the apps' own tables in public.
	_, err = admin.Exec(ctx, `
CREATE SCHEMA files; CREATE TABLE files.upload (id serial PRIMARY KEY, name text);
CREATE TYPE files.state AS ENUM ('a', 'b'); CREATE FUNCTION files.one() RETURNS int LANGUAGE sql AS 'SELECT 1';
CREATE TABLE public."User" (id text PRIMARY KEY); INSERT INTO public."User" VALUES ('u1');`)
	require.NoError(t, err)

	roles := []Role{
		{Service: "files", Password: "files-password-123456", StatementTimeout: 3 * time.Second, IdleInTransactionTimeout: time.Minute, ConnectionLimit: -1},
		{Service: "system", Password: "system-password-123456", StatementTimeout: 15 * time.Second, IdleInTransactionTimeout: time.Minute, ConnectionLimit: 20},
	}
	require.NoError(t, Apply(ctx, admin, roles, logger))
	require.NoError(t, Apply(ctx, admin, roles, logger), "running again changes nothing")

	as := func(role Role) *pgxpool.Pool {
		u, err := url.Parse(adminURL)
		require.NoError(t, err)
		u.User = url.UserPassword(role.Login(), role.Password)
		pool, err := pgxpool.New(ctx, u.String())
		require.NoError(t, err)
		t.Cleanup(pool.Close)
		return pool
	}
	files, system := as(roles[0]), as(roles[1])

	// Each login works in its own schema: it owns what was there, and migrations run as it.
	_, err = files.Exec(ctx, `INSERT INTO upload (name) VALUES ('x'); ALTER TABLE files.upload ADD COLUMN size int; SELECT files.one()`)
	require.NoError(t, err)
	require.NoError(t, migrate.Run(ctx, system, migrate.Options{Schema: "system", Migrations: migrations.FS, Logger: logger}))
	var timeout, path string
	require.NoError(t, files.QueryRow(ctx, "SELECT current_setting('statement_timeout'), current_setting('search_path')").Scan(&timeout, &path))
	assert.Equal(t, "3s", timeout)
	assert.Equal(t, "files", path)

	// …and nowhere else.
	for name, sql := range map[string]string{
		"another service": `SELECT count(*) FROM files.upload`,
		"the apps' data":  `SELECT count(*) FROM public."User"`,
		"a new schema":    `CREATE SCHEMA intruder`,
	} {
		_, err := system.Exec(ctx, sql)
		assert.Error(t, err, name)
	}
	var super bool
	require.NoError(t, system.QueryRow(ctx, "SELECT rolsuper FROM pg_roles WHERE rolname = current_user").Scan(&super))
	assert.False(t, super)

	// A table someone else moves in later is handed over on the next run.
	_, err = admin.Exec(ctx, `CREATE TABLE system.handoff (id int)`)
	require.NoError(t, err)
	_, err = system.Exec(ctx, `SELECT * FROM system.handoff`)
	require.Error(t, err)
	require.NoError(t, Apply(ctx, admin, roles, logger))
	_, err = system.Exec(ctx, `SELECT * FROM system.handoff`)
	require.NoError(t, err)

	// A new password takes effect on the next run.
	roles[1].Password = "system-password-rotated"
	require.NoError(t, Apply(ctx, admin, roles, logger))
	rotated := as(roles[1])
	require.NoError(t, rotated.Ping(ctx))

	require.Error(t, Apply(ctx, admin, []Role{{Service: "Bad-Name", Password: "long-enough-password"}}, logger))
	require.Error(t, Apply(ctx, admin, []Role{{Service: "short", Password: "x"}}, logger))
}
