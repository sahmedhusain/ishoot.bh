package main
import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"os"
	"strings"
	"testing"
	"time"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/santhosh-tekuri/jsonschema/v6"
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
	_, err = pool.Exec(ctx, `CREATE TABLE public."User" (id text primary key,email text unique not null,"fullName" text,"passwordHash" text not null,role text not null,"isActive" boolean not null,"mfaEnabled" boolean not null,"mfaSecretEncrypted" text,"mfaLastStep" bigint,"lastLoginAt" timestamp,"createdAt" timestamp not null,"updatedAt" timestamp not null,permissions jsonb);
 CREATE TABLE public."Customer" (id text primary key,email text unique not null,"passwordHash" text,"googleSub" text,"appleSub" text,"createdAt" timestamp not null,"updatedAt" timestamp not null);
 CREATE TABLE public."MfaRecoveryCode" ("userId" text not null,"codeHash" text not null,"usedAt" timestamp);
 CREATE TABLE public."Role" (id text PRIMARY KEY,"nameEn" text NOT NULL,"nameAr" text NOT NULL,"isSystem" boolean NOT NULL,"createdAt" timestamp NOT NULL);
 CREATE TABLE public."Permission" (id text PRIMARY KEY,role text NOT NULL,resource text NOT NULL,action text NOT NULL,allowed boolean NOT NULL,"createdAt" timestamp NOT NULL, UNIQUE(role,resource,action));
 CREATE TABLE public."RoleDataScope" (role text NOT NULL,area text NOT NULL,scope text NOT NULL,PRIMARY KEY(role,area));
 CREATE TABLE public."AuthChallenge" (id text primary key, "userId" text, "codeHash" text, type text, attempts int, "expiresAt" timestamp, "createdAt" timestamp, email text);
 CREATE TABLE public."CustomerAuthCode" (id text primary key, email text, "codeHash" text, attempts int, "expiresAt" timestamp, "createdAt" timestamp, "usedAt" timestamp);
 INSERT INTO public."Role" VALUES ('admin','Admin','مدير',true,'2026-10-01 12:00:00'),('viewer','Viewer','مشاهد',false,'2026-10-01 12:00:00');
 INSERT INTO public."Permission" VALUES ('grant-1','admin','invoices','write',true,'2026-10-01 12:00:00'),('deny-1','admin','invoices','approve',false,'2026-10-01 12:00:00');
 INSERT INTO public."RoleDataScope" VALUES ('admin','deals','department');`)
	require.NoError(t, err)
	legacy, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	require.NoError(t, err)
	const legacyMFA = "MTIzNDU2Nzg5MDEy.WAqUAxCQ3k3ssm1UH8s12w==.KMdZE+lMPbU7vI5DnqCbdg=="
	_, err = pool.Exec(ctx, `INSERT INTO public."User" (id, email, "fullName", "passwordHash", role, "isActive", "mfaEnabled", "mfaSecretEncrypted", "mfaLastStep", "lastLoginAt", "createdAt", "updatedAt", permissions) VALUES ('user-123','Alice@Example.test','Alice Smith',$1,'admin',true,true,$2,123,'2026-10-30 12:00:00','2026-10-01 12:00:00','2026-10-02 12:00:00','{"invoices:read":false,"invoices:edit":true}'::jsonb)`, string(legacy), legacyMFA)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO public."Customer" (id, email, "passwordHash", "createdAt", "updatedAt") VALUES ('customer-1','alice@example.test',NULL,'2026-09-01 12:00:00','2026-09-02 12:00:00'); INSERT INTO public."MfaRecoveryCode" VALUES ('user-123','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','2026-10-05 12:00:00')`)
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
	require.Equal(t, int64(2), dry.Roles)
	require.Equal(t, int64(2), dry.Permissions)
	require.Equal(t, int64(1), dry.Scopes)
	require.Zero(t, dry.AccountsInserted)
	var count int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.account`).Scan(&count))
	require.Zero(t, count)
	report, err := run(ctx, pool, options{Apply: true, Actor: "test-operator", Keyring: ring})
	require.NoError(t, err)
	require.Equal(t, int64(2), report.AccountsInserted)
	require.Equal(t, int64(1), report.RecoveryInserted)
	require.Equal(t, int64(2), report.RolesInserted)
	require.Equal(t, int64(2), report.PermissionsInserted)
	require.Equal(t, int64(1), report.ScopesInserted)
	require.Equal(t, int64(1), report.AccessInserted)
	var accessPreserved bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT
 (SELECT permission_overrides FROM identity.staff_access WHERE subject_id='user-123')='{"invoices:read":false,"invoices:edit":true}'::jsonb
 AND (SELECT scope FROM identity.staff_role_scope WHERE role_id='admin' AND area='deals')='department'
 AND (SELECT NOT allowed FROM identity.staff_permission WHERE id='deny-1')
 AND (SELECT allowed FROM identity.staff_permission WHERE id='grant-1')
 AND (SELECT name_ar='مدير' AND is_system AND created_at='2026-10-01 12:00:00+00' FROM identity.staff_role WHERE id='admin')`).Scan(&accessPreserved))
	require.True(t, accessPreserved)
	var email string
	var created time.Time
	var lastStep int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT email,created_at,mfa_last_step FROM identity.account WHERE realm='staff'`).Scan(&email, &created, &lastStep))
	require.Equal(t, "alice@example.test", email)
	require.True(t, created.Equal(time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC)))
	require.EqualValues(t, 123, lastStep)
	again, err := run(ctx, pool, options{Apply: true, Actor: "test-operator", Keyring: ring})
	require.NoError(t, err)
	require.Zero(t, again.AccountsInserted)
	require.Zero(t, again.RecoveryInserted)
	require.Zero(t, again.RolesInserted+again.PermissionsInserted+again.ScopesInserted+again.AccessInserted)
	var payload map[string]any
	require.NoError(t, pool.QueryRow(ctx, `SELECT payload FROM identity.outbox WHERE subject='identity.snapshot.imported'`).Scan(&payload))
	require.Equal(t, map[string]any{"changedBy": "operator:test-operator", "accountsInserted": float64(2), "recoveryInserted": float64(1), "rolesInserted": float64(2), "permissionsInserted": float64(2), "scopesInserted": float64(1), "accessInserted": float64(1), "providersInserted": float64(0), "resetChallengesInserted": float64(0), "customerCodesInserted": float64(0)}, payload)
	rawSchema, err := os.ReadFile("../../contracts/events/identity.snapshot.imported.v1.json")
	require.NoError(t, err)
	var schemaDoc any
	require.NoError(t, json.Unmarshal(rawSchema, &schemaDoc))
	compiler := jsonschema.NewCompiler()
	require.NoError(t, compiler.AddResource("https://platform.local/event.json", schemaDoc))
	eventSchema, err := compiler.Compile("https://platform.local/event.json")
	require.NoError(t, err)
	require.NoError(t, eventSchema.Validate(payload))
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.outbox`).Scan(&count))
	require.Equal(t, 1, count)
	_, err = pool.Exec(ctx, `INSERT INTO public."User" (id, email, "fullName", "passwordHash", role, "isActive", "mfaEnabled", "mfaSecretEncrypted", "mfaLastStep", "lastLoginAt", "createdAt", "updatedAt", permissions) SELECT 'pending','pending@example.test',"fullName","passwordHash",role,true,false,NULL,NULL,NULL,"createdAt","updatedAt",NULL FROM public."User" WHERE id='user-123'`)
	require.NoError(t, err)
	for _, tc := range []struct{ name, change, restore, want string }{
		{"orphan recovery", `INSERT INTO public."MfaRecoveryCode"("userId","codeHash") VALUES ('missing',repeat('b',64))`, `DELETE FROM public."MfaRecoveryCode" WHERE "userId"='missing'`, "invalid or stale legacy recovery code"},
		{"assignment", `UPDATE public."User" SET role='missing' WHERE id='pending'`, `UPDATE public."User" SET role='admin' WHERE id='pending'`, "orphan staff assignment"},
		{"permission", `UPDATE public."Permission" SET action='unknown' WHERE id='deny-1'`, `UPDATE public."Permission" SET action='approve' WHERE id='deny-1'`, "invalid staff permission"},
		{"scope", `UPDATE public."RoleDataScope" SET scope='unknown'`, `UPDATE public."RoleDataScope" SET scope='department'`, "invalid staff scope"},
		{"override shape", `UPDATE public."User" SET permissions='[]' WHERE id='pending'`, `UPDATE public."User" SET permissions=NULL WHERE id='pending'`, "invalid permission override"},
		{"override key", `UPDATE public."User" SET permissions='{"unknown:view":true}' WHERE id='pending'`, `UPDATE public."User" SET permissions=NULL WHERE id='pending'`, "invalid permission override"},
		{"override value", `UPDATE public."User" SET permissions='{"invoices:read":"true"}' WHERE id='pending'`, `UPDATE public."User" SET permissions=NULL WHERE id='pending'`, "invalid permission override"},
		{"target role", `UPDATE identity.staff_role SET name_en='changed' WHERE id='admin'`, `UPDATE identity.staff_role SET name_en='Admin' WHERE id='admin'`, "target role conflict"},
		{"target extra role", `INSERT INTO identity.staff_role(id,name_en,name_ar) VALUES ('extra','Extra','إضافي')`, `DELETE FROM identity.staff_role WHERE id='extra'`, "target role conflict"},
		{"target permission", `UPDATE identity.staff_permission SET allowed=true WHERE id='deny-1'`, `UPDATE identity.staff_permission SET allowed=false WHERE id='deny-1'`, "target permission conflict"},
		{"target scope", `UPDATE identity.staff_role_scope SET scope='all'`, `UPDATE identity.staff_role_scope SET scope='department'`, "target scope conflict"},
		{"target override", `UPDATE identity.staff_access SET permission_overrides='{}'`, `UPDATE identity.staff_access SET permission_overrides='{"invoices:read":false,"invoices:edit":true}'`, "target override conflict"},
		{"target timestamp", `UPDATE identity.account SET created_at=created_at+interval '1 second' WHERE realm='staff'`, `UPDATE identity.account SET created_at=created_at-interval '1 second' WHERE realm='staff'`, "target account conflict"},
		{"audit rollback", `ALTER TABLE identity.outbox ADD CONSTRAINT reject_import CHECK(subject<>'identity.snapshot.imported') NOT VALID`, `ALTER TABLE identity.outbox DROP CONSTRAINT reject_import`, "outbox: enqueue"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, err := pool.Exec(ctx, tc.change)
			require.NoError(t, err)
			_, err = run(ctx, pool, options{Apply: true, Actor: "test-operator", Keyring: ring})
			require.ErrorContains(t, err, tc.want)
			require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.account WHERE subject_id='pending'`).Scan(&count))
			require.Zero(t, count)
			require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.staff_access WHERE subject_id='pending'`).Scan(&count))
			require.Zero(t, count)
			_, err = pool.Exec(ctx, tc.restore)
			require.NoError(t, err)
		})
	}
	_, err = pool.Exec(ctx, `DELETE FROM public."User" WHERE id='pending'`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET password_hash='newer' WHERE realm='staff'`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO public."User" (id, email, "fullName", "passwordHash", role, "isActive", "mfaEnabled", "mfaSecretEncrypted", "mfaLastStep", "lastLoginAt", "createdAt", "updatedAt", permissions) VALUES ('new-user','new@example.test','New User',$1,'viewer',true,false,NULL,NULL,NULL,now(),now(),NULL)`, string(legacy))
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Actor: "test-operator", Keyring: ring})
	require.ErrorContains(t, err, "target account conflict")
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.account WHERE subject_id='new-user'`).Scan(&count))
	require.Zero(t, count)
	require.NoError(t, pool.QueryRow(ctx, `SELECT password_hash FROM identity.account WHERE realm='staff'`).Scan(&email))
	require.Equal(t, "newer", email)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET password_hash=$1 WHERE realm='staff'`, string(legacy))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO public."User" (id, email, "fullName", "passwordHash", role, "isActive", "mfaEnabled", "mfaSecretEncrypted", "mfaLastStep", "lastLoginAt", "createdAt", "updatedAt", permissions) VALUES ('dup','ALICE@example.test','Dup User',$1,'viewer',true,false,NULL,NULL,NULL,now(),now(),NULL)`, string(legacy))
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Actor: "test-operator", Keyring: ring})
	require.ErrorContains(t, err, "normalized email collision")
	_, err = pool.Exec(ctx, `DELETE FROM public."User" WHERE id='dup'; INSERT INTO identity.account (realm,subject_id,email,roles) VALUES ('staff','ghost','ghost@example.test',ARRAY['viewer'])`)
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Actor: "test-operator", Keyring: ring})
	require.ErrorContains(t, err, "absent from the legacy snapshot")
	_, err = pool.Exec(ctx, `DELETE FROM identity.account WHERE subject_id='ghost'`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO identity.mfa_recovery_code (realm,subject_id,code_hash) VALUES ('staff','user-123',$1)`, strings.Repeat("b", 64))
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Actor: "test-operator", Keyring: ring})
	require.ErrorContains(t, err, "target recovery code")
	_, err = pool.Exec(ctx, `DELETE FROM identity.mfa_recovery_code WHERE code_hash=$1`, strings.Repeat("b", 64))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE public."User" SET "passwordHash"='unsupported' WHERE id='new-user'`)
	require.NoError(t, err)
	_, err = run(ctx, pool, options{Apply: true, Actor: "test-operator", Keyring: ring})
	require.ErrorContains(t, err, "unsupported legacy password")
}
func TestApplyRequiresOperator(t *testing.T) {
	for _, actor := range []string{"", "with spaces", "line\nbreak", "معرف", strings.Repeat("a", 192)} {
		_, err := run(context.Background(), nil, options{Apply: true, Actor: actor})
		require.ErrorContains(t, err, "operator ID")
	}
}
