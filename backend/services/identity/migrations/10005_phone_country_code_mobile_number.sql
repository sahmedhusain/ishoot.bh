-- +goose Up
ALTER TABLE identity."user" ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE identity."user" ADD COLUMN IF NOT EXISTS mobile_number TEXT;

UPDATE identity."user"
SET
  country_code = COALESCE(country_code, CASE
    WHEN phone LIKE '+973%' THEN 'BH'
    WHEN phone LIKE '+966%' THEN 'SA'
    WHEN phone LIKE '+971%' THEN 'AE'
    WHEN phone LIKE '+974%' THEN 'QA'
    WHEN phone LIKE '+965%' THEN 'KW'
    WHEN phone LIKE '+968%' THEN 'OM'
    WHEN phone LIKE '+962%' THEN 'JO'
    WHEN phone LIKE '+20%' THEN 'EG'
    WHEN phone LIKE '+44%' THEN 'GB'
    WHEN phone LIKE '+1%' THEN 'US'
    ELSE NULL
  END),
  mobile_number = COALESCE(mobile_number, CASE
    WHEN phone LIKE '+973%' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone LIKE '+966%' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone LIKE '+971%' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone LIKE '+974%' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone LIKE '+965%' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone LIKE '+968%' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone LIKE '+962%' THEN regexp_replace(substr(phone, 5), '\D', '', 'g')
    WHEN phone LIKE '+20%' THEN regexp_replace(substr(phone, 4), '\D', '', 'g')
    WHEN phone LIKE '+44%' THEN regexp_replace(substr(phone, 4), '\D', '', 'g')
    WHEN phone LIKE '+1%' THEN regexp_replace(substr(phone, 3), '\D', '', 'g')
    ELSE NULLIF(regexp_replace(phone, '\D', '', 'g'), '')
  END)
WHERE phone IS NOT NULL AND phone <> '' AND (country_code IS NULL OR mobile_number IS NULL);

-- +goose Down
SELECT 1;
