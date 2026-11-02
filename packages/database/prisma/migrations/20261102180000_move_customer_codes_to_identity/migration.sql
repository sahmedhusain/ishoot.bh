-- Customer email proof belongs to identity. Service values win if both schemas already contain a code.
-- Keep the old table until all customer auth callers are replaced; no app may continue issuing codes after cutover.
CREATE SCHEMA IF NOT EXISTS identity;
CREATE TABLE IF NOT EXISTS identity.customer_code (
 email text PRIMARY KEY,
 id text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
 hash_kind text NOT NULL DEFAULT 'hmac' CHECK (hash_kind IN ('hmac', 'sha256')),
 code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 expires_at timestamptz NOT NULL,
 used_at timestamptz
);
CREATE INDEX IF NOT EXISTS customer_code_expiry_idx ON identity.customer_code(expires_at);

DO $$ BEGIN
 IF to_regclass('public."CustomerAuthCode"') IS NOT NULL THEN
  INSERT INTO identity.customer_code(email,hash_kind,code_hash,attempts,expires_at,used_at)
  SELECT DISTINCT ON (lower(email)) lower(email),'sha256',"codeHash",LEAST(attempts,5),
   "expiresAt" AT TIME ZONE 'UTC',"usedAt" AT TIME ZONE 'UTC'
  FROM public."CustomerAuthCode" WHERE "expiresAt" AT TIME ZONE 'UTC' > CURRENT_TIMESTAMP AND "usedAt" IS NULL
  ORDER BY lower(email),"createdAt" DESC,id DESC
  ON CONFLICT(email) DO NOTHING;
 END IF;
END $$;
