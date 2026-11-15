-- +goose Up
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE commerce.sales_order ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE commerce.sales_order ADD COLUMN IF NOT EXISTS mobile_number TEXT;

UPDATE commerce.customer
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

UPDATE commerce.customer_address
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

UPDATE commerce.sales_order
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

-- +goose Down
SELECT 1;
