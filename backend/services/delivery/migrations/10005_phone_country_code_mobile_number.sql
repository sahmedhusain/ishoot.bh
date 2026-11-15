-- +goose Up
ALTER TABLE delivery.shipment ADD COLUMN IF NOT EXISTS recipient_country_code TEXT;
ALTER TABLE delivery.shipment ADD COLUMN IF NOT EXISTS recipient_mobile_number TEXT;
ALTER TABLE delivery.courier_agency ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE delivery.courier_agency ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE delivery.order_ref ADD COLUMN IF NOT EXISTS recipient_country_code TEXT;
ALTER TABLE delivery.order_ref ADD COLUMN IF NOT EXISTS recipient_mobile_number TEXT;

UPDATE delivery.shipment
SET
  recipient_country_code = COALESCE(recipient_country_code, CASE
    WHEN recipient_phone LIKE '+973%' THEN 'BH' WHEN recipient_phone LIKE '+966%' THEN 'SA' WHEN recipient_phone LIKE '+971%' THEN 'AE'
    WHEN recipient_phone LIKE '+974%' THEN 'QA' WHEN recipient_phone LIKE '+965%' THEN 'KW' WHEN recipient_phone LIKE '+968%' THEN 'OM'
    WHEN recipient_phone LIKE '+962%' THEN 'JO' WHEN recipient_phone LIKE '+20%' THEN 'EG' WHEN recipient_phone LIKE '+44%' THEN 'GB' WHEN recipient_phone LIKE '+1%' THEN 'US'
    ELSE NULL END),
  recipient_mobile_number = COALESCE(recipient_mobile_number, CASE
    WHEN recipient_phone ~ '^\+(973|966|971|974|965|968|962)' THEN regexp_replace(substr(recipient_phone, 5), '\D', '', 'g')
    WHEN recipient_phone ~ '^\+(20|44)' THEN regexp_replace(substr(recipient_phone, 4), '\D', '', 'g')
    WHEN recipient_phone LIKE '+1%' THEN regexp_replace(substr(recipient_phone, 3), '\D', '', 'g')
    ELSE NULLIF(regexp_replace(recipient_phone, '\D', '', 'g'), '') END)
WHERE recipient_phone IS NOT NULL AND recipient_phone <> '' AND (recipient_country_code IS NULL OR recipient_mobile_number IS NULL);

UPDATE delivery.courier_agency
SET
  country_code = COALESCE(country_code, CASE
    WHEN phone LIKE '+973%' THEN 'BH' WHEN phone LIKE '+966%' THEN 'SA' WHEN phone LIKE '+971%' THEN 'AE'
    WHEN phone LIKE '+974%' THEN 'QA' WHEN phone LIKE '+965%' THEN 'KW' WHEN phone LIKE '+968%' THEN 'OM'
    WHEN phone LIKE '+962%' THEN 'JO' WHEN phone LIKE '+20%' THEN 'EG' WHEN phone LIKE '+44%' THEN 'GB' WHEN phone LIKE '+1%' THEN 'US'
    ELSE NULL END),
  mobile_number = COALESCE(mobile_number, CASE
    WHEN phone ~ '^\+(973|966|971|974|965|968|962)' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone ~ '^\+(20|44)' THEN regexp_replace(substr(phone, 4), '\D', '', 'g')
    WHEN phone LIKE '+1%' THEN regexp_replace(substr(phone, 3), '\D', '', 'g')
    ELSE NULLIF(regexp_replace(phone, '\D', '', 'g'), '') END)
WHERE phone IS NOT NULL AND phone <> '' AND (country_code IS NULL OR mobile_number IS NULL);

UPDATE delivery.order_ref
SET
  recipient_country_code = COALESCE(recipient_country_code, CASE
    WHEN recipient_phone LIKE '+973%' THEN 'BH' WHEN recipient_phone LIKE '+966%' THEN 'SA' WHEN recipient_phone LIKE '+971%' THEN 'AE'
    WHEN recipient_phone LIKE '+974%' THEN 'QA' WHEN recipient_phone LIKE '+965%' THEN 'KW' WHEN recipient_phone LIKE '+968%' THEN 'OM'
    WHEN recipient_phone LIKE '+962%' THEN 'JO' WHEN recipient_phone LIKE '+20%' THEN 'EG' WHEN recipient_phone LIKE '+44%' THEN 'GB' WHEN recipient_phone LIKE '+1%' THEN 'US'
    ELSE NULL END),
  recipient_mobile_number = COALESCE(recipient_mobile_number, CASE
    WHEN recipient_phone ~ '^\+(973|966|971|974|965|968|962)' THEN regexp_replace(substr(recipient_phone, 5), '\D', '', 'g')
    WHEN recipient_phone ~ '^\+(20|44)' THEN regexp_replace(substr(recipient_phone, 4), '\D', '', 'g')
    WHEN recipient_phone LIKE '+1%' THEN regexp_replace(substr(recipient_phone, 3), '\D', '', 'g')
    ELSE NULLIF(regexp_replace(recipient_phone, '\D', '', 'g'), '') END)
WHERE recipient_phone IS NOT NULL AND recipient_phone <> '' AND (recipient_country_code IS NULL OR recipient_mobile_number IS NULL);

-- +goose Down
SELECT 1;
