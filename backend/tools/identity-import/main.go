package main
import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"unicode/utf8"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/secrets"
)
type settings struct {
	Database	db.Config	`envPrefix:"DATABASE_"`
	Password	password.Config	`envPrefix:"IDENTITY_LOGIN_PASSWORD_"`
	MFAKeys		[]string	`env:"IDENTITY_LOGIN_MFA_KEYS" envSeparator:","`
	MFAPrimaryID	string		`env:"IDENTITY_LOGIN_MFA_PRIMARY_ID"`
	MFALegacyKey	string		`env:"IDENTITY_LOGIN_MFA_LEGACY_KEY"`
}
type options struct {
	Apply		bool
	Actor		string
	Keyring		*secrets.Keyring
	MaxBcryptCost	int
}
type summary struct {
	ProvidersInserted, ResetChallengesInserted, CustomerCodesInserted					int64
	Staff, Customers, RecoveryCodes, Roles, Permissions, Scopes						int64
	AccountsInserted, RecoveryInserted, RolesInserted, PermissionsInserted, ScopesInserted, AccessInserted	int64
}
const sourceAccounts = `WITH source_accounts AS (
 SELECT 'staff'::text AS realm, u.id AS subject_id, lower(btrim(u.email)) AS email, u."passwordHash" AS password_hash,
 ARRAY[u.role]::text[] AS roles, u."isActive" AS active, u."mfaEnabled" AS mfa_enabled,
 u."mfaSecretEncrypted" AS mfa_secret_encrypted, u."mfaLastStep" AS mfa_last_step,
 u."lastLoginAt" AT TIME ZONE 'UTC' AS last_login_at,
 u."createdAt" AT TIME ZONE 'UTC' AS created_at, u."updatedAt" AT TIME ZONE 'UTC' AS updated_at
 FROM public."User" u
 UNION ALL
 SELECT 'customer'::text,c.id,lower(btrim(c.email)),NULLIF(c."passwordHash",''),ARRAY[]::text[],true,false,NULL::text,NULL::bigint,
 NULL::timestamptz,c."createdAt" AT TIME ZONE 'UTC',c."updatedAt" AT TIME ZONE 'UTC'
 FROM public."Customer" c
) `
func main() {
	apply := flag.Bool("apply", false, "copy accounts and access after validation (default: validation only)")
	actor := flag.String("actor", "", "operator ID recorded in audit; required with -apply")
	flag.Parse()
	var cfg settings
	if err := config.Load(&cfg); err != nil {
		fmt.Fprintln(os.Stderr, "identity-import:", err)
		os.Exit(1)
	}
	if _, err := password.New(cfg.Password); err != nil {
		fmt.Fprintln(os.Stderr, "identity-import: invalid password configuration:", err)
		os.Exit(1)
	}
	var ring *secrets.Keyring
	if len(cfg.MFAKeys) > 0 {
		var err error
		ring, err = secrets.NewKeyring(secrets.Config{Keys: cfg.MFAKeys, PrimaryKeyID: cfg.MFAPrimaryID, LegacyMFAKey: cfg.MFALegacyKey})
		if err != nil {
			fmt.Fprintln(os.Stderr, "identity-import: invalid MFA key configuration:", err)
			os.Exit(1)
		}
	}
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	ctx := context.Background()
	pool, err := db.Open(ctx, cfg.Database, logger)
	if err == nil {
		var report summary
		report, err = run(ctx, pool, options{Apply: *apply, Actor: *actor, Keyring: ring, MaxBcryptCost: cfg.Password.MaxBcryptCost})
		pool.Close()
		if err == nil {
			logger.Info("identity import complete", "apply", *apply, "staff", report.Staff, "customers", report.Customers, "recovery_codes", report.RecoveryCodes, "roles", report.Roles, "permissions", report.Permissions, "scopes", report.Scopes, "accounts_inserted", report.AccountsInserted, "recovery_inserted", report.RecoveryInserted, "roles_inserted", report.RolesInserted, "permissions_inserted", report.PermissionsInserted, "scopes_inserted", report.ScopesInserted, "access_inserted", report.AccessInserted, "providers_inserted", report.ProvidersInserted, "reset_challenges_inserted", report.ResetChallengesInserted, "customer_codes_inserted", report.CustomerCodesInserted)
		}
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "identity-import:", err)
		os.Exit(1)
	}
}
func run(ctx context.Context, pool *pgxpool.Pool, opts options) (summary, error) {
	var report summary
	if opts.Apply && (opts.Actor == "" || len(opts.Actor) > 191 || strings.IndexFunc(opts.Actor, func(r rune) bool { return r < 33 || r > 126 }) >= 0) {
		return report, fmt.Errorf("apply requires an ASCII operator ID of 1–191 characters without spaces")
	}
	if opts.MaxBcryptCost == 0 {
		opts.MaxBcryptCost = 16
	}
	err := db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `LOCK TABLE public."User", public."Customer", public."MfaRecoveryCode", public."Role", public."Permission", public."RoleDataScope", public."AuthChallenge", public."CustomerAuthCode" IN SHARE MODE;
LOCK TABLE identity.account, identity.mfa_recovery_code, identity.staff_role, identity.staff_permission, identity.staff_role_scope, identity.staff_access,identity.customer_provider,identity.legacy_reset_challenge,identity.customer_code IN SHARE ROW EXCLUSIVE MODE`); err != nil {
			return fmt.Errorf("lock legacy tables: %w", err)
		}
		if err := tx.QueryRow(ctx, `SELECT (SELECT count(*) FROM public."User"),(SELECT count(*) FROM public."Customer"),(SELECT count(*) FROM public."MfaRecoveryCode")`).Scan(&report.Staff, &report.Customers, &report.RecoveryCodes); err != nil {
			return err
		}
		var bad int64
		if err := tx.QueryRow(ctx, sourceAccounts+`SELECT count(*) FROM (SELECT realm,email FROM source_accounts GROUP BY realm,email HAVING count(*)>1) duplicates`).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d normalized email collision(s); reconcile before import", bad)
		}
		if err := tx.QueryRow(ctx, sourceAccounts+`SELECT count(*) FROM source_accounts WHERE length(email)=0 OR length(email)>254 OR subject_id='' OR (mfa_enabled AND mfa_secret_encrypted IS NULL)`).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d invalid legacy account(s); reconcile before import", bad)
		}
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM public."MfaRecoveryCode" r LEFT JOIN public."User" u ON u.id=r."userId" WHERE u.id IS NULL OR r."codeHash" !~ '^[a-f0-9]{64}$' OR NOT u."mfaEnabled"`).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d invalid or stale legacy recovery code(s); reconcile before import", bad)
		}
		if err := validateEmails(ctx, tx); err != nil {
			return err
		}
		if err := validateMFA(ctx, tx, opts.Keyring); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, sourceAccounts+`SELECT count(*) FROM source_accounts s JOIN identity.account a ON a.realm=s.realm AND (a.subject_id=s.subject_id OR a.email=s.email)
   WHERE a.subject_id<>s.subject_id OR a.email<>s.email OR a.password_hash IS DISTINCT FROM s.password_hash OR a.roles IS DISTINCT FROM s.roles
   OR a.active IS DISTINCT FROM s.active OR a.mfa_enabled IS DISTINCT FROM s.mfa_enabled OR a.mfa_secret_encrypted IS DISTINCT FROM s.mfa_secret_encrypted
		   OR a.mfa_last_step IS DISTINCT FROM s.mfa_last_step OR a.last_login_at IS DISTINCT FROM s.last_login_at
   OR a.created_at IS DISTINCT FROM s.created_at OR a.updated_at IS DISTINCT FROM s.updated_at`).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d target account conflict(s); no existing identity account was overwritten", bad)
		}
		if err := tx.QueryRow(ctx, sourceAccounts+`SELECT count(*) FROM source_accounts WHERE password_hash IS NOT NULL AND CASE WHEN password_hash ~ '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$' THEN substring(password_hash from 5 for 2)::int NOT BETWEEN 4 AND $1 ELSE true END`, opts.MaxBcryptCost).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d unsupported legacy password hash(es); reset or reconcile before import", bad)
		}
		if err := tx.QueryRow(ctx, sourceAccounts+`SELECT count(*) FROM identity.account a WHERE a.realm IN ('staff','customer') AND NOT EXISTS (SELECT 1 FROM source_accounts s WHERE s.realm=a.realm AND s.subject_id=a.subject_id)`).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d target account(s) are absent from the legacy snapshot; reconcile before import", bad)
		}
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM identity.mfa_recovery_code a WHERE a.realm='staff' AND NOT EXISTS (SELECT 1 FROM public."MfaRecoveryCode" r WHERE r."userId"=a.subject_id AND r."codeHash"=a.code_hash)`).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d target recovery code(s) are absent from the legacy snapshot; reconcile before import", bad)
		}
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM public."MfaRecoveryCode" r JOIN identity.mfa_recovery_code a ON a.realm='staff' AND a.subject_id=r."userId" AND a.code_hash=r."codeHash" WHERE a.used_at IS DISTINCT FROM (r."usedAt" AT TIME ZONE 'UTC')`).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d target recovery-code conflict(s); no recovery state was overwritten", bad)
		}
		if err := validateStaffAccess(ctx, tx, &report); err != nil {
			return err
		}
		if err := validateCredentialHandoff(ctx, tx, opts.MaxBcryptCost); err != nil {
			return err
		}
		if !opts.Apply {
			return nil
		}
		tag, err := tx.Exec(ctx, sourceAccounts+`INSERT INTO identity.account (realm,subject_id,email,password_hash,roles,active,mfa_enabled,mfa_secret_encrypted,mfa_last_step,last_login_at,created_at,updated_at)
   SELECT realm,subject_id,email,password_hash,roles,active,mfa_enabled,mfa_secret_encrypted,mfa_last_step,last_login_at,created_at,updated_at FROM source_accounts
   ON CONFLICT (realm,subject_id) DO NOTHING`)
		if err != nil {
			return fmt.Errorf("copy accounts: %w", err)
		}
		report.AccountsInserted = tag.RowsAffected()
		tag, err = tx.Exec(ctx, `INSERT INTO identity.mfa_recovery_code (realm,subject_id,code_hash,used_at)
   SELECT 'staff',"userId","codeHash","usedAt" AT TIME ZONE 'UTC' FROM public."MfaRecoveryCode" ON CONFLICT (realm,subject_id,code_hash) DO NOTHING`)
		if err != nil {
			return fmt.Errorf("copy recovery codes: %w", err)
		}
		report.RecoveryInserted = tag.RowsAffected()
		if err := copyStaffAccess(ctx, tx, &report); err != nil {
			return err
		}
		if err := copyCredentialHandoff(ctx, tx, &report); err != nil {
			return err
		}
		if report.ProvidersInserted+report.ResetChallengesInserted+report.CustomerCodesInserted+report.AccountsInserted+report.RecoveryInserted+report.RolesInserted+report.PermissionsInserted+report.ScopesInserted+report.AccessInserted == 0 {
			return nil
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.snapshot.imported", Payload: map[string]any{
			"changedBy":		"operator:" + opts.Actor,
			"providersInserted":	report.ProvidersInserted, "resetChallengesInserted": report.ResetChallengesInserted, "customerCodesInserted": report.CustomerCodesInserted,
			"accountsInserted":	report.AccountsInserted, "recoveryInserted": report.RecoveryInserted,
			"rolesInserted":	report.RolesInserted, "permissionsInserted": report.PermissionsInserted,
			"scopesInserted":	report.ScopesInserted, "accessInserted": report.AccessInserted,
		}})
	})
	return report, err
}
func validateEmails(ctx context.Context, tx pgx.Tx) error {
	rows, err := tx.Query(ctx, `SELECT email,lower(btrim(email)) FROM public."User" UNION ALL SELECT email,lower(btrim(email)) FROM public."Customer"`)
	if err != nil {
		return err
	}
	defer rows.Close()
	invalid := 0
	for rows.Next() {
		var original, canonical string
		if err := rows.Scan(&original, &canonical); err != nil {
			return err
		}
		if !utf8.ValidString(original) || len(canonical) > 254 || strings.ToLower(strings.TrimSpace(original)) != canonical {
			invalid++
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if invalid > 0 {
		return fmt.Errorf("%d email(s) normalize differently between database and identity; reconcile before import", invalid)
	}
	return nil
}
func validateMFA(ctx context.Context, tx pgx.Tx, ring *secrets.Keyring) error {
	rows, err := tx.Query(ctx, `SELECT id,"mfaSecretEncrypted" FROM public."User" WHERE "mfaEnabled" AND "mfaSecretEncrypted" IS NOT NULL`)
	if err != nil {
		return err
	}
	defer rows.Close()
	bad := 0
	for rows.Next() {
		var id, value string
		if err := rows.Scan(&id, &value); err != nil {
			return err
		}
		if ring == nil {
			bad++
			continue
		}
		plain, err := ring.Open(value, id)
		if err != nil || len(plain) == 0 || len(plain) > 128 {
			bad++
		}
		for i := range plain {
			plain[i] = 0
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if bad > 0 {
		return fmt.Errorf("%d MFA secret(s) could not be verified with the configured key ring", bad)
	}
	return nil
}
