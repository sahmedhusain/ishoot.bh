SELECT * FROM identity.account WHERE realm=$1 AND (email=$2 OR lower(email)=lower($2) OR (username IS NOT NULL AND lower(username)=lower($2)));
SELECT * FROM identity.account WHERE realm=$1 AND subject_id=$2 FOR UPDATE;
UPDATE identity.account SET password_hash=$3, updated_at=$4 WHERE realm=$1 AND subject_id=$2;
UPDATE identity.account SET mfa_last_step=$3, updated_at=$4 WHERE realm=$1 AND subject_id=$2;
UPDATE identity.mfa_recovery_code SET used_at=$4 WHERE realm=$1 AND subject_id=$2 AND code_hash=$3 AND used_at IS NULL;
UPDATE identity.account SET last_login_at=$3 WHERE realm=$1 AND subject_id=$2;
SELECT a.subject_id, a.roles FROM identity.account a
JOIN identity.session_family s ON s.realm=a.realm AND s.subject_id=a.subject_id
WHERE s.id=$1 AND s.realm=$2 AND s.revoked_at IS NULL AND s.expires_at>$3
 AND a.active;
SELECT * FROM identity.account WHERE realm=$1 AND subject_id=$2;
UPDATE identity.account SET mfa_pending_secret_encrypted=$3, mfa_pending_expires_at=$4, updated_at=$5 WHERE realm=$1 AND subject_id=$2;
UPDATE identity.account SET mfa_enabled=$3, mfa_secret_encrypted=$4, mfa_last_step=$5,
 mfa_pending_secret_encrypted=NULL, mfa_pending_expires_at=NULL, updated_at=$6 WHERE realm=$1 AND subject_id=$2;
DELETE FROM identity.mfa_recovery_code WHERE realm=$1 AND subject_id=$2;
INSERT INTO identity.mfa_recovery_code (realm,subject_id,code_hash) VALUES ($1,$2,$3);
UPDATE identity.session_family SET revoked_at=COALESCE(revoked_at,$3) WHERE realm=$1 AND subject_id=$2;
UPDATE identity.account SET mfa_pending_secret_encrypted=NULL, mfa_pending_expires_at=NULL
WHERE (realm,subject_id) IN (
 SELECT a.realm,a.subject_id FROM identity.account AS a WHERE a.mfa_pending_expires_at <= @cutoff
 ORDER BY a.mfa_pending_expires_at,a.realm,a.subject_id LIMIT @batch_size::int FOR UPDATE SKIP LOCKED
);
SELECT count(*) FROM identity.account WHERE realm=$1;
INSERT INTO identity.account (realm,subject_id,email,password_hash,roles,mfa_enabled,mfa_secret_encrypted,created_at,updated_at)
VALUES (@realm,@subject_id,@email,@password_hash,@roles::text[],@mfa_enabled,@mfa_secret_encrypted,@now,@now);
