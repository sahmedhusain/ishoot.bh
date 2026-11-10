SELECT subject_id,email,roles,active,mfa_enabled,created_at,last_login_at FROM identity.account
WHERE realm='it' AND subject_id > @cursor::text ORDER BY subject_id LIMIT @row_limit::int;
SELECT count(*) FROM identity.account
WHERE realm='it' AND active AND password_hash IS NOT NULL AND roles @> ARRAY['it_admin'];
UPDATE identity.account SET roles = @roles::text[], active = @active, updated_at = @now
WHERE realm='it' AND subject_id = @subject_id;
