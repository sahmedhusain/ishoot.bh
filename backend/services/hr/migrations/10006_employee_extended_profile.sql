-- +goose Up
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS contacts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS emails jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS health_record jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS work_location text;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS probation_end_date date;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS iban text;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS hr_notes text;

ALTER TABLE hr.employee ALTER COLUMN email DROP NOT NULL;
ALTER TABLE hr.employee DROP CONSTRAINT IF EXISTS employee_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS employee_email_unique_nonempty_idx
  ON hr.employee (lower(email))
  WHERE email IS NOT NULL AND btrim(email) <> '';

UPDATE hr.employee
SET contacts = jsonb_build_array(
  jsonb_build_object(
    'id', 'primary-phone',
    'type', 'mobile',
    'value', phone,
    'countryCode', COALESCE(country_code, 'BH'),
    'isPrimary', true
  )
)
WHERE phone IS NOT NULL AND btrim(phone) <> '' AND contacts = '[]'::jsonb;

UPDATE hr.employee
SET emails = jsonb_build_array(
  jsonb_build_object(
    'id', 'primary-email',
    'type', 'work',
    'value', email,
    'isPrimary', true,
    'syncToAccount', true
  )
)
WHERE email IS NOT NULL AND btrim(email) <> '' AND emails = '[]'::jsonb;

-- +goose Down
SELECT 1;
