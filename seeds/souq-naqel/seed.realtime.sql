-- ============================================================================
-- SERVICE SEED (realtime): Souq Al-Bahrain Trading S.P.C. (souq-naqel)
-- ============================================================================
BEGIN;

INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'omar-haddad', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;
INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'yusuf-rahman', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;
INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'layla-nasser', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;
INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'karim-fawzi', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;
INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'tariq-saleh', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;
INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'noor-hamdan', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;
INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'faisal-mansour', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;
INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'sami-khoury', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;
INSERT INTO realtime.status (realm, user_id, status, message, updated_at) VALUES ('staff', 'hana-yousef', 'online', 'Available', now()) ON CONFLICT (realm, user_id) DO NOTHING;

COMMIT;
