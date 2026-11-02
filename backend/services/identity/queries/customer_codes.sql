-- name: StoreCustomerCode :exec
INSERT INTO identity.customer_code (email,code_hash,expires_at,id) VALUES ($1,$2,$3,$4)
ON CONFLICT (email) DO UPDATE SET id=EXCLUDED.id, hash_kind='hmac', code_hash=EXCLUDED.code_hash, expires_at=EXCLUDED.expires_at, attempts=0, used_at=NULL;
-- name: LockCustomerCode :one
SELECT * FROM identity.customer_code WHERE email=$1 FOR UPDATE;
-- name: FailCustomerCode :exec
UPDATE identity.customer_code SET attempts=LEAST(attempts+1,5) WHERE email=$1;
-- name: ConsumeCustomerCode :exec
UPDATE identity.customer_code SET used_at=$2 WHERE email=$1;
-- name: CreateCodeCustomer :execrows
INSERT INTO identity.account (realm,subject_id,email,roles,active) VALUES ('customer',$1,$2,'{}',true)
ON CONFLICT (realm,email) DO NOTHING;
-- name: LockCustomerByEmail :one
SELECT * FROM identity.account WHERE realm='customer' AND email=$1 FOR UPDATE;
-- name: MarkCustomerLogin :exec
UPDATE identity.account SET last_login_at=$3 WHERE realm=$1 AND subject_id=$2;
-- name: DeleteExpiredCustomerCodes :execrows
DELETE FROM identity.customer_code WHERE email IN (
 SELECT cc.email FROM identity.customer_code cc WHERE cc.expires_at <= @cutoff ORDER BY cc.expires_at,cc.email
 LIMIT @batch_size::int FOR UPDATE SKIP LOCKED
);
-- name: DeleteExpiredPasswordResets :execrows
DELETE FROM identity.password_reset WHERE token_hash IN (
 SELECT pr.token_hash FROM identity.password_reset pr WHERE pr.expires_at <= @cutoff ORDER BY pr.expires_at,pr.token_hash
 LIMIT @batch_size::int FOR UPDATE SKIP LOCKED
);

-- name: RegisterCustomer :exec
INSERT INTO identity.account(realm,subject_id,email,password_hash,roles,active)
VALUES ('customer',$1,$2,$3,'{}',true);
