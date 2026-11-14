-- ============================================================================
-- SERVICE SEED (delivery): Horizon Skills Academy W.L.L. (bahrain-academy)
-- ============================================================================
BEGIN;

INSERT INTO delivery.delivery_settings (id, mode, sla_hours, time_zone, slot_days, lead_minutes, require_slot, updated_at) VALUES ('default', 'disabled', 24, 'Asia/Bahrain', 7, 60, false, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO delivery.delivery_zone (id, name_en, name_ar, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES ('dz-manama', 'Capital Governorate', 'محافظة العاصمة', 2, 5, 40, false, 1, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO delivery.delivery_zone (id, name_en, name_ar, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES ('dz-muharraq', 'Muharraq Governorate', 'محافظة المحرق', 2.5, 5, 40, false, 2, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO delivery.delivery_zone (id, name_en, name_ar, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES ('dz-northern', 'Northern Governorate', 'المحافظة الشمالية', 2.5, 5, 40, false, 3, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO delivery.delivery_zone (id, name_en, name_ar, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES ('dz-southern', 'Southern Governorate', 'المحافظة الجنوبية', 3, 5, 40, false, 4, now(), now()) ON CONFLICT (id) DO NOTHING;

COMMIT;
