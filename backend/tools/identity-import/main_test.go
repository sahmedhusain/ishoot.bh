package main

import (
	"context"
	"encoding/base64"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/secrets"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/identity/migrations"
)

func TestImportValidatesPreservesAndCanBeRerun(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	_, err = pool.Exec(ctx, `CREATE TABLE public."User" (id text primary key,email text unique not null,"passwordHash" text not null,role text not null,"isActive" boolean not null,"mfaEnabled" boolean not null,"mfaSecretEncrypted" text,"mfaLastStep" bigint,"lastLoginAt" timestamp,"createdAt" timestamp not null,"updatedAt" timestamp not null);
 CREATE TABLE public."Customer" (id text primary key,email text unique not null,"passwordHash" text,"createdAt" timestamp not null,"updatedAt" timestamp not null);
 CREATE TABLE public."MfaRecoveryCode" ("userId" text not null,"codeHash" text not null,"usedAt" timestamp);`)
	require.NoError(t, err)
	legacy, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	require.NoError(t, err)
	const legacyMFA = "MTIzNDU2Nzg5MDEy.WAqUAxCQ3k3ssm1UH8s12w==.KMdZE+lMPbU7vI5DnqCbdg=="
	_, err = pool.Exec(ctx, `INSERT INTO public."User" VALUES ('user-123','Alice@Example.test',$1,'admin',true,true,$2,123,'2026-10-30 12:00:00','2026-10-01 12:00:00','2026-10-02 12:00:00')`, string(legacy), legacyMFA)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO public."Customer" VALUES ('customer-1','alice@example.test',NULL,'2026-09-01 12:00:00','2026-09-02 12:00:00'); INSERT INTO public."MfaRecoveryCode" VALUES ('user-123','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','2026-10-05 12:00:00')`)
	require.NoError(t, err)
	b64 := func(s string) string { return base64.StdEncoding.EncodeToString([]byte(strings.Repeat(s, 32))) }
	ring, err := secrets.NewKeyring(secrets.Config{Keys: []string{"primary:" + b64("a")}, PrimaryKeyID: "primary", LegacyMFAKey: b64("b")})
	require.NoError(t, err)
	_, err = run(ctx, pool, options{})
	require.ErrorContains(t, err, "MFA secret")
	wrongRing, err := secrets.NewKeyring(secrets.Config{Keys: []string{"primary:" + b64("a")}, PrimaryKeyID: "primary", LegacyMFAKey: b64("c")})
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Keyring: wrongRing})
	require.ErrorContains(t, err, "MFA secret")
	moreExpensive, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost+1)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE public."User" SET "passwordHash"=$1`, string(moreExpensive))
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Keyring: ring, MaxBcryptCost: bcrypt.MinCost})
	require.ErrorContains(t, err, "unsupported legacy password")
	_, err = pool.Exec(ctx, `UPDATE public."User" SET "passwordHash"=$1`, string(legacy))
	require.NoError(t, err)
	dry, err := run(ctx, pool, options{Keyring: ring})
	require.NoError(t, err)
	require.Equal(t, int64(1), dry.Staff)
	require.Equal(t, int64(1), dry.Customers)
	require.Zero(t, dry.AccountsInserted)
	var count int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.account`).Scan(&count))
	require.Zero(t, count)
	report, err := run(ctx, pool, options{Apply: true, Keyring: ring})
	require.NoError(t, err)
	require.Equal(t, int64(2), report.AccountsInserted)
	require.Equal(t, int64(1), report.RecoveryInserted)
	var email string
	var created time.Time
	var lastStep int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT email,created_at,mfa_last_step FROM identity.account WHERE realm='staff'`).Scan(&email, &created, &lastStep))
	require.Equal(t, "alice@example.test", email)
	require.True(t, created.Equal(time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC)))
	require.EqualValues(t, 123, lastStep)
	again, err := run(ctx, pool, options{Apply: true, Keyring: ring})
	require.NoError(t, err)
	require.Zero(t, again.AccountsInserted)
	require.Zero(t, again.RecoveryInserted)
	// New target credentials must never be overwritten by stale legacy data; no other source row may leak through.
	_, err = pool.Exec(ctx, `UPDATE identity.account SET password_hash='newer' WHERE realm='staff'`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO public."User" VALUES ('new-user','new@example.test',$1,'viewer',true,false,NULL,NULL,NULL,now(),now())`, string(legacy))
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Keyring: ring})
	require.ErrorContains(t, err, "target account conflict")
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.account WHERE subject_id='new-user'`).Scan(&count))
	require.Zero(t, count)
	require.NoError(t, pool.QueryRow(ctx, `SELECT password_hash FROM identity.account WHERE realm='staff'`).Scan(&email))
	require.Equal(t, "newer", email)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET password_hash=$1 WHERE realm='staff'`, string(legacy))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO public."User" VALUES ('dup','ALICE@example.test',$1,'viewer',true,false,NULL,NULL,NULL,now(),now())`, string(legacy))
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Keyring: ring})
	require.ErrorContains(t, err, "normalized email collision")
	_, err = pool.Exec(ctx, `DELETE FROM public."User" WHERE id='dup'; INSERT INTO identity.account (realm,subject_id,email,roles) VALUES ('staff','ghost','ghost@example.test',ARRAY['viewer'])`)
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Keyring: ring})
	require.ErrorContains(t, err, "absent from the legacy snapshot")
	_, err = pool.Exec(ctx, `DELETE FROM identity.account WHERE subject_id='ghost'`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO identity.mfa_recovery_code (realm,subject_id,code_hash) VALUES ('staff','user-123',$1)`, strings.Repeat("b", 64))
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Keyring: ring})
	require.ErrorContains(t, err, "target recovery code")
	_, err = pool.Exec(ctx, `DELETE FROM identity.mfa_recovery_code WHERE code_hash=$1`, strings.Repeat("b", 64))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE public."User" SET "passwordHash"='unsupported' WHERE id='new-user'`)
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Keyring: ring})
	require.ErrorContains(t, err, "unsupported legacy password")

}
