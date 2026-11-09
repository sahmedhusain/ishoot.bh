package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

const sourceProviderLinks = `WITH source_provider_links AS (
 SELECT p.provider,p.provider_subject,c.id AS subject_id,c."createdAt" AT TIME ZONE 'UTC' AS created_at
 FROM public."Customer" c CROSS JOIN LATERAL (VALUES ('google',NULLIF(c."googleSub",'')),('apple',NULLIF(c."appleSub",''))) p(provider,provider_subject)
 WHERE p.provider_subject IS NOT NULL
) `
const sourceResetChallenges = `WITH source_reset_challenges AS (
 SELECT c.id,c."userId" AS subject_id,c."codeHash" AS code_hash,c.type AS kind,c.attempts,
 c."expiresAt" AT TIME ZONE 'UTC' AS expires_at,c."createdAt" AT TIME ZONE 'UTC' AS created_at
 FROM public."AuthChallenge" c JOIN public."User" u ON u.id=c."userId"
 WHERE c.type IN ('password_reset','invitation') AND c."expiresAt" AT TIME ZONE 'UTC'>now() AND c.attempts<3
 AND u."isActive" AND lower(btrim(c.email))=lower(btrim(u.email))
) `
const sourceCustomerCodes = `WITH source_customer_codes AS (
 SELECT DISTINCT ON(lower(btrim(email))) id,lower(btrim(email)) AS email,"codeHash" AS code_hash,attempts,
 "expiresAt" AT TIME ZONE 'UTC' AS expires_at
 FROM public."CustomerAuthCode" WHERE "usedAt" IS NULL AND "expiresAt" AT TIME ZONE 'UTC'>now() AND attempts<5
 ORDER BY lower(btrim(email)),"createdAt" DESC,id DESC
) `

func validateCredentialHandoff(ctx context.Context, tx pgx.Tx, maxCost int) error {
	checks := []struct {
		sql, message string
		args         []any
	}{
		{sourceProviderLinks + `SELECT count(*) FROM source_provider_links WHERE length(provider_subject)>512 OR btrim(provider_subject)=''`, "invalid provider link(s)", nil},
		{sourceProviderLinks + `SELECT count(*) FROM source_provider_links s JOIN identity.customer_provider p ON p.provider=s.provider AND (p.provider_subject=s.provider_subject OR p.subject_id=s.subject_id) WHERE p.provider_subject<>s.provider_subject OR p.subject_id<>s.subject_id`, "conflicting provider link(s)", nil},
		{sourceResetChallenges + `SELECT count(*) FROM source_reset_challenges WHERE attempts<0 OR CASE WHEN code_hash ~ '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$' THEN substring(code_hash from 5 for 2)::int NOT BETWEEN 4 AND $1 ELSE true END`, "invalid reset verifier(s)", []any{maxCost}},
		{sourceResetChallenges + `SELECT count(*) FROM (SELECT subject_id FROM source_reset_challenges GROUP BY subject_id HAVING count(*)>100) excessive`, "account(s) exceed the bounded legacy reset handoff; reconcile before import", nil},
		{sourceResetChallenges + `SELECT count(*) FROM source_reset_challenges s JOIN identity.legacy_reset_challenge c ON c.id=s.id WHERE c.subject_id<>s.subject_id OR c.code_hash<>s.code_hash OR c.kind<>s.kind OR c.attempts<>s.attempts OR c.used_at IS NOT NULL OR c.expires_at<>s.expires_at OR c.created_at<>s.created_at`, "conflicting reset challenge(s)", nil},
		{sourceCustomerCodes + `SELECT count(*) FROM source_customer_codes WHERE attempts<0 OR code_hash !~ '^[a-f0-9]{64}$' OR email='' OR length(email)>254`, "invalid customer code(s)", nil},
	}
	for _, check := range checks {
		var bad int64
		if err := tx.QueryRow(ctx, check.sql, check.args...).Scan(&bad); err != nil {
			return err
		}
		if bad > 0 {
			return fmt.Errorf("%d %s", bad, check.message)
		}
	}
	return nil
}

func copyCredentialHandoff(ctx context.Context, tx pgx.Tx, report *summary) error {
	copies := []struct {
		sql   string
		count *int64
	}{
		{sourceProviderLinks + `INSERT INTO identity.customer_provider(provider,provider_subject,subject_id,created_at) SELECT provider,provider_subject,subject_id,created_at FROM source_provider_links ON CONFLICT DO NOTHING`, &report.ProvidersInserted},
		{sourceResetChallenges + `INSERT INTO identity.legacy_reset_challenge(id,subject_id,code_hash,kind,attempts,expires_at,created_at) SELECT id,subject_id,code_hash,kind,attempts,expires_at,created_at FROM source_reset_challenges ON CONFLICT(id) DO NOTHING`, &report.ResetChallengesInserted},
		{sourceCustomerCodes + `INSERT INTO identity.customer_code(email,id,hash_kind,code_hash,attempts,expires_at) SELECT email,id,'sha256',code_hash,attempts,expires_at FROM source_customer_codes ON CONFLICT(email) DO NOTHING`, &report.CustomerCodesInserted},
	}
	for _, copy := range copies {
		tag, err := tx.Exec(ctx, copy.sql)
		if err != nil {
			return err
		}
		*copy.count = tag.RowsAffected()
	}
	return nil
}
