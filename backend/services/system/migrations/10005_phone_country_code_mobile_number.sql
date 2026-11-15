-- +goose Up
ALTER TABLE system.company_setting ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE system.company_setting ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE system.company_setting ADD COLUMN IF NOT EXISTS whatsapp_country_code TEXT;
ALTER TABLE system.company_setting ADD COLUMN IF NOT EXISTS whatsapp_mobile_number TEXT;
ALTER TABLE system.client_contact_person ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE system.client_contact_person ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE system.media_contact ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE system.media_contact ADD COLUMN IF NOT EXISTS mobile_number TEXT;

UPDATE system.company_setting
SET
  country_code = COALESCE(country_code, NULLIF(country, ''), CASE
    WHEN phone LIKE '+973%' THEN 'BH' WHEN phone LIKE '+966%' THEN 'SA' WHEN phone LIKE '+971%' THEN 'AE'
    WHEN phone LIKE '+974%' THEN 'QA' WHEN phone LIKE '+965%' THEN 'KW' WHEN phone LIKE '+968%' THEN 'OM'
    WHEN phone LIKE '+962%' THEN 'JO' WHEN phone LIKE '+20%' THEN 'EG' WHEN phone LIKE '+44%' THEN 'GB' WHEN phone LIKE '+1%' THEN 'US'
    ELSE NULL END),
  mobile_number = COALESCE(mobile_number, CASE
    WHEN phone ~ '^\+(973|966|971|974|965|968|962)' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone ~ '^\+(20|44)' THEN regexp_replace(substr(phone, 4), '\D', '', 'g')
    WHEN phone LIKE '+1%' THEN regexp_replace(substr(phone, 3), '\D', '', 'g')
    ELSE NULLIF(regexp_replace(phone, '\D', '', 'g'), '') END),
  whatsapp_country_code = COALESCE(whatsapp_country_code, NULLIF(country, ''), CASE
    WHEN whatsapp_phone LIKE '+973%' THEN 'BH' WHEN whatsapp_phone LIKE '+966%' THEN 'SA' WHEN whatsapp_phone LIKE '+971%' THEN 'AE'
    WHEN whatsapp_phone LIKE '+974%' THEN 'QA' WHEN whatsapp_phone LIKE '+965%' THEN 'KW' WHEN whatsapp_phone LIKE '+968%' THEN 'OM'
    WHEN whatsapp_phone LIKE '+962%' THEN 'JO' WHEN whatsapp_phone LIKE '+20%' THEN 'EG' WHEN whatsapp_phone LIKE '+44%' THEN 'GB' WHEN whatsapp_phone LIKE '+1%' THEN 'US'
    ELSE NULL END),
  whatsapp_mobile_number = COALESCE(whatsapp_mobile_number, CASE
    WHEN whatsapp_phone ~ '^\+(973|966|971|974|965|968|962)' THEN regexp_replace(substr(whatsapp_phone, 5), '\D', '', 'g')
    WHEN whatsapp_phone ~ '^\+(20|44)' THEN regexp_replace(substr(whatsapp_phone, 4), '\D', '', 'g')
    WHEN whatsapp_phone LIKE '+1%' THEN regexp_replace(substr(whatsapp_phone, 3), '\D', '', 'g')
    ELSE NULLIF(regexp_replace(whatsapp_phone, '\D', '', 'g'), '') END)
WHERE country_code IS NULL OR mobile_number IS NULL OR whatsapp_country_code IS NULL OR whatsapp_mobile_number IS NULL;

UPDATE system.client_contact_person
SET
  country_code = COALESCE(country_code, CASE
    WHEN phone LIKE '+973%' THEN 'BH' WHEN phone LIKE '+966%' THEN 'SA'
    WHEN phone LIKE '+971%' THEN 'AE' WHEN phone LIKE '+974%' THEN 'QA'
    WHEN phone LIKE '+965%' THEN 'KW' WHEN phone LIKE '+968%' THEN 'OM'
    WHEN phone LIKE '+962%' THEN 'JO' WHEN phone LIKE '+20%' THEN 'EG'
    WHEN phone LIKE '+44%' THEN 'GB' WHEN phone LIKE '+1%' THEN 'US'
    ELSE NULL END),
  mobile_number = COALESCE(mobile_number, CASE
    WHEN phone ~ '^\+(973|966|971|974|965|968|962)' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone ~ '^\+(20|44)' THEN regexp_replace(substr(phone, 4), '\D', '', 'g')
    WHEN phone LIKE '+1%' THEN regexp_replace(substr(phone, 3), '\D', '', 'g')
    ELSE NULLIF(regexp_replace(phone, '\D', '', 'g'), '') END)
WHERE phone IS NOT NULL AND phone <> '' AND (country_code IS NULL OR mobile_number IS NULL);

-- +goose Down
SELECT 1;
