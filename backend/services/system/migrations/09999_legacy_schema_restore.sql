-- +goose Up
CREATE TABLE IF NOT EXISTS system.company_setting (
id TEXT PRIMARY KEY,
singleton INTEGER UNIQUE,
company_name_en TEXT,
company_name_ar TEXT,
cr_number TEXT,
vat_id TEXT,
vat_enabled BOOLEAN,
vat_percentage DECIMAL,
vat_certificate_url TEXT,
default_currency TEXT,
currency_decimals INTEGER,
address_en TEXT,
address_ar TEXT,
phone TEXT,
whatsapp_phone TEXT,
email TEXT,
website TEXT,
instagram_url TEXT,
linkedin_url TEXT,
youtube_url TEXT,
bank_name TEXT,
bank_iban TEXT,
bank_account_number TEXT,
bank_swift TEXT,
time_zone TEXT,
logo_url TEXT,
dark_logo_url TEXT,
full_logo_url TEXT,
dark_full_logo_url TEXT,
icon_url TEXT,
dark_icon_url TEXT,
document_header_url TEXT,
document_footer_url TEXT,
stamp_url TEXT,
signature_url TEXT,
payment_terms_days INTEGER,
invoice_prefix TEXT,
invoice_next_number INTEGER,
receipt_prefix TEXT,
receipt_next_number INTEGER,
ceo_name_en TEXT,
ceo_name_ar TEXT,
ceo_title_en TEXT,
ceo_title_ar TEXT,
ceo_quote_en TEXT,
ceo_quote_ar TEXT,
mission_en TEXT,
mission_ar TEXT,
vision_en TEXT,
vision_ar TEXT,
about_text_en TEXT,
about_text_ar TEXT,
terms_en TEXT,
terms_ar TEXT,
rules_en TEXT,
rules_ar TEXT,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
default_discount_limit_percent DECIMAL,
quotations_always_need_approval BOOLEAN,
theme JSONB,
setup_completed_at TIMESTAMPTZ,
primary_language TEXT,
business_activity TEXT,
tagline_en TEXT,
tagline_ar TEXT,
founded_year INTEGER,
city TEXT,
country TEXT,
map_url TEXT,
website_domain TEXT,
admin_domain TEXT
);

CREATE TABLE IF NOT EXISTS system.hero_banner (
id TEXT PRIMARY KEY,
title_en TEXT,
title_ar TEXT,
subtitle_en TEXT,
subtitle_ar TEXT,
media_type TEXT,
media_url TEXT,
poster_url TEXT,
display_order INTEGER,
is_active BOOLEAN,
cta_label_en TEXT,
cta_label_ar TEXT,
cta_link TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
is_sample BOOLEAN
);

CREATE TABLE IF NOT EXISTS system.client_logo (
id TEXT PRIMARY KEY,
name TEXT,
logo_url TEXT,
website_url TEXT,
is_dark_logo BOOLEAN,
display_order INTEGER,
is_active BOOLEAN
);

CREATE TABLE IF NOT EXISTS system.studio_equipment (
id TEXT PRIMARY KEY,
category TEXT,
name_en TEXT,
name_ar TEXT,
brand TEXT,
daily_rate_bhd DECIMAL,
quantity INTEGER,
specification TEXT,
description_en TEXT,
description_ar TEXT,
image_url TEXT,
display_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.inquiry (
id TEXT PRIMARY KEY,
name TEXT,
email TEXT,
email_norm TEXT,
phone TEXT,
phone_e164 TEXT,
company_name TEXT,
service_type TEXT,
budget_range TEXT,
timeline TEXT,
message TEXT,
status TEXT,
locale TEXT,
source TEXT,
customer_id TEXT,
intent TEXT,
reference TEXT UNIQUE,
submission_key TEXT UNIQUE,
request_hash TEXT,
project_reference TEXT,
location TEXT,
assigned_to_id TEXT,
team TEXT,
workflow_status TEXT,
custom_assignments JSONB
);

CREATE TABLE IF NOT EXISTS system.inquiry_note (
id TEXT PRIMARY KEY,
inquiry_id TEXT,
author_id TEXT,
body TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.client_contact_person (
id TEXT PRIMARY KEY,
contact_id TEXT,
full_name TEXT,
position TEXT,
department TEXT,
email TEXT,
phone TEXT,
is_primary BOOLEAN,
notes TEXT,
display_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.calendar_event (
id TEXT PRIMARY KEY,
title TEXT,
title_ar TEXT,
description TEXT,
start_date TIMESTAMPTZ,
end_date TIMESTAMPTZ,
all_day BOOLEAN,
location TEXT,
color TEXT,
event_type TEXT,
deal_id TEXT,
created_by_id TEXT,
google_event_id TEXT,
google_calendar_id TEXT,
recurrence TEXT,
reminders JSONB,
attendees JSONB,
visibility TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.activity_log (
id TEXT PRIMARY KEY,
user_id TEXT,
action TEXT,
entity_type TEXT,
entity_id TEXT,
details JSONB,
diff_payload JSONB
);

CREATE TABLE IF NOT EXISTS system.notification (
id TEXT PRIMARY KEY,
user_id TEXT,
title TEXT,
message TEXT,
type TEXT,
entity_type TEXT,
entity_id TEXT,
message_key TEXT,
message_params JSONB,
action_url TEXT,
event_key TEXT,
is_read BOOLEAN,
hidden_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.tag (
id TEXT PRIMARY KEY,
name TEXT,
name_ar TEXT,
color TEXT,
entity_type TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.attachment (
id TEXT PRIMARY KEY,
file_name TEXT,
file_url TEXT,
file_size INTEGER,
mime_type TEXT,
entity_type TEXT,
entity_id TEXT,
uploaded_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.document_template (
id TEXT PRIMARY KEY,
slug TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
category TEXT,
body_html TEXT,
body_json JSONB,
version INTEGER,
is_active BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.contract (
id TEXT PRIMARY KEY,
contract_number TEXT UNIQUE,
deal_id TEXT,
contact_id TEXT,
template_id TEXT,
title_en TEXT,
title_ar TEXT,
body_html TEXT,
status TEXT,
signature_hash TEXT,
signed_at TIMESTAMPTZ,
valid_from TIMESTAMPTZ,
valid_until TIMESTAMPTZ,
pdf_storage_path TEXT,
metadata JSONB,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.minute_of_meeting (
id TEXT PRIMARY KEY,
mom_number TEXT UNIQUE,
title TEXT,
title_ar TEXT,
meeting_date TIMESTAMPTZ,
start_time TEXT,
end_time TEXT,
location TEXT,
deal_id TEXT,
client_id TEXT,
attendees JSONB
);

CREATE TABLE IF NOT EXISTS system.generated_document (
id TEXT PRIMARY KEY,
document_type TEXT,
source_entity_type TEXT,
source_entity_id TEXT,
file_name TEXT,
storage_path TEXT,
file_size INTEGER,
checksum TEXT,
generated_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.company_document (
id TEXT PRIMARY KEY,
title_en TEXT,
title_ar TEXT,
category TEXT,
document_number TEXT,
file_url TEXT,
file_size INTEGER,
mime_type TEXT,
valid_from TIMESTAMPTZ,
valid_until TIMESTAMPTZ,
notes TEXT,
uploaded_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.service (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
category TEXT,
description_en TEXT,
description_ar TEXT,
unit TEXT,
default_rate DECIMAL,
is_active BOOLEAN,
display_order INTEGER,
is_public BOOLEAN,
image_url TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
is_sample BOOLEAN
);

CREATE TABLE IF NOT EXISTS system.feature_toggle (
id TEXT PRIMARY KEY,
module_key TEXT UNIQUE,
is_enabled BOOLEAN,
name_en TEXT,
name_ar TEXT,
description TEXT
);

CREATE TABLE IF NOT EXISTS system.review (
id TEXT PRIMARY KEY,
client_id TEXT,
original_locale TEXT,
submission_key TEXT UNIQUE,
request_hash TEXT,
author_en TEXT,
author_ar TEXT,
company_en TEXT,
company_ar TEXT,
quote_en TEXT,
quote_ar TEXT,
rating INTEGER,
is_approved BOOLEAN,
sort_order INTEGER,
year TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.faq (
id TEXT PRIMARY KEY,
question_en TEXT,
question_ar TEXT,
answer_en TEXT,
answer_ar TEXT,
category TEXT,
is_published BOOLEAN,
sort_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
is_sample BOOLEAN
);

CREATE TABLE IF NOT EXISTS system.statistic (
id TEXT PRIMARY KEY,
value TEXT,
label_en TEXT,
label_ar TEXT,
sub_label_en TEXT,
sub_label_ar TEXT,
icon TEXT,
sort_order INTEGER,
source TEXT,
preset TEXT,
preset_param INTEGER,
round_to INTEGER,
suffix TEXT,
is_sample BOOLEAN
);

CREATE TABLE IF NOT EXISTS system.revalidation_job (
id TEXT PRIMARY KEY,
event_key TEXT UNIQUE,
payload JSONB,
status TEXT,
attempts INTEGER,
next_attempt_at TIMESTAMPTZ,
last_error TEXT,
delivered_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.upload_object (
id TEXT PRIMARY KEY,
file_url TEXT UNIQUE,
owner_id TEXT,
file_name TEXT,
file_size INTEGER,
mime_type TEXT,
is_public BOOLEAN,
claimed_at TIMESTAMPTZ,
expires_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.abuse_window (
key TEXT PRIMARY KEY,
count INTEGER,
expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system.email_job (
id TEXT PRIMARY KEY,
event_key TEXT UNIQUE,
mom_id TEXT,
created_by_id TEXT,
recipient TEXT,
subject TEXT,
html TEXT,
attachment_name TEXT,
attachment TEXT,
status TEXT,
attempts INTEGER,
next_attempt_at TIMESTAMPTZ,
provider_id TEXT,
last_error TEXT,
accepted_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS credentials TEXT;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS config JSONB;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS sync_lease_token TEXT;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS sync_lease_until TIMESTAMPTZ;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS health_status TEXT;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE system.integration_setting ADD COLUMN IF NOT EXISTS updated_by_id TEXT;
CREATE TABLE IF NOT EXISTS system.communication_thread (
id TEXT PRIMARY KEY,
subject TEXT,
status TEXT,
contact_id TEXT,
inquiry_id TEXT,
assigned_to TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.communication_message (
id TEXT PRIMARY KEY,
thread_id TEXT,
message_id TEXT UNIQUE,
in_reply_to TEXT,
direction TEXT,
from_email TEXT,
to_email TEXT,
subject TEXT,
body_text TEXT,
body_html TEXT,
status TEXT,
delivery_log JSONB,
invoice_id TEXT,
quotation_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.message_attachment (
id TEXT PRIMARY KEY,
message_id TEXT,
filename TEXT,
content_type TEXT,
size INTEGER,
storage_path TEXT,
is_quarantined BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.profile_change_request (
id TEXT PRIMARY KEY,
user_id TEXT,
requested_by_id TEXT,
manager_id TEXT,
status TEXT,
old_values JSONB,
new_values JSONB,
reviewed_at TIMESTAMPTZ,
review_notes TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.approval_request (
id TEXT PRIMARY KEY,
target_type TEXT,
target_id TEXT,
revision INTEGER,
content_hash TEXT,
status TEXT,
requested_by_id TEXT,
policy_snapshot JSONB,
diff_payload JSONB,
discount_reason TEXT,
policy_id TEXT,
current_step INTEGER,
self_approved BOOLEAN
);

CREATE TABLE IF NOT EXISTS system.approval_decision (
id TEXT PRIMARY KEY,
approval_request_id TEXT,
decision TEXT,
decided_by_id TEXT,
reason TEXT,
step INTEGER,
signature_data TEXT,
decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system.approval_policy (
id TEXT PRIMARY KEY,
target_type TEXT UNIQUE,
enabled BOOLEAN,
allow_self_approval BOOLEAN,
reminder_after_hours INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.approval_policy_step (
id TEXT PRIMARY KEY,
policy_id TEXT,
"order" INTEGER,
approver_mode TEXT,
role_key TEXT,
user_id TEXT,
permission TEXT,
min_amount DECIMAL,
min_days DECIMAL,
min_discount_percent DECIMAL,
escalate_after_hours INTEGER,
escalate_mode TEXT,
escalate_role_key TEXT,
escalate_user_id TEXT
);

CREATE TABLE IF NOT EXISTS system.reference_sequence (
id TEXT PRIMARY KEY,
prefix TEXT,
year INTEGER,
last_number INTEGER,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.request_event (
id TEXT PRIMARY KEY,
inquiry_id TEXT,
actor_id TEXT,
event_type TEXT,
details JSONB,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.request_assignment (
id TEXT PRIMARY KEY,
inquiry_id TEXT,
assigned_to_id TEXT,
assigned_by_id TEXT,
team TEXT,
reason TEXT,
active BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.request_comment (
id TEXT PRIMARY KEY,
inquiry_id TEXT,
author_id TEXT,
body TEXT,
is_client_visible BOOLEAN,
channel TEXT,
attachments JSONB,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.exchange_rate_snapshot (
id TEXT PRIMARY KEY,
base_currency TEXT,
quote_currency TEXT,
rate DECIMAL,
effective_date TIMESTAMPTZ,
fetched_at TIMESTAMPTZ,
provider TEXT,
source_evidence TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.document_fx (
id TEXT PRIMARY KEY,
document_type TEXT,
document_id TEXT,
base_amount DECIMAL,
target_amount DECIMAL,
raw_rate DECIMAL,
margin_percent DECIMAL,
effective_rate DECIMAL,
rate_snapshot_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.bank_settlement (
id TEXT PRIMARY KEY,
payment_id TEXT UNIQUE,
settlement_date TIMESTAMPTZ,
received_amount DECIMAL,
received_currency TEXT,
settled_amount_bhd DECIMAL,
bank_fee_bhd DECIMAL,
fx_gain_loss_bhd DECIMAL,
bank_reference TEXT,
status TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.employment_record (
id TEXT PRIMARY KEY,
employee_id TEXT,
contract_type TEXT,
basic_salary DECIMAL,
housing_allowance DECIMAL,
transport_allowance DECIMAL,
other_allowances DECIMAL,
payroll_settings JSONB,
effective_from TIMESTAMPTZ,
effective_to TIMESTAMPTZ,
is_current BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.hr_policy (
id TEXT PRIMARY KEY,
salary_timing TEXT,
pay_day INTEGER,
attendance_cutoff_day INTEGER,
workday_hours DECIMAL,
workday_start TEXT,
daily_rate_basis TEXT,
deduction_base TEXT,
overtime_base TEXT,
overtime_rate DECIMAL,
overtime_night_rate DECIMAL,
overtime_rest_day_rate DECIMAL,
overtime_holiday_rate DECIMAL,
late_grace_minutes INTEGER,
deduct_lateness BOOLEAN,
unmarked_days TEXT,
prorate_joiners BOOLEAN,
commission_in_payroll BOOLEAN,
gratuity_rules JSONB
);

CREATE TABLE IF NOT EXISTS system.public_holiday (
id TEXT PRIMARY KEY,
date TIMESTAMPTZ UNIQUE,
name_en TEXT,
name_ar TEXT
);

CREATE TABLE IF NOT EXISTS system.payslip (
id TEXT PRIMARY KEY,
payroll_item_id TEXT UNIQUE,
employee_id TEXT,
month INTEGER,
year INTEGER,
storage_path TEXT,
issued_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system.account_change_request (
id TEXT PRIMARY KEY,
user_id TEXT,
requested_by_id TEXT,
changes JSONB,
before JSONB,
reason TEXT,
status TEXT,
decided_by_id TEXT,
review_notes TEXT,
decided_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.signature_change (
id TEXT PRIMARY KEY,
user_id TEXT,
signature_url TEXT,
previous_url TEXT,
status TEXT,
reviewed_by_id TEXT,
review_notes TEXT,
decided_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.client_signature (
id TEXT PRIMARY KEY,
document_type TEXT,
document_id TEXT,
method TEXT,
status TEXT,
token_hash TEXT UNIQUE,
expires_at TIMESTAMPTZ,
recipient_email TEXT,
signer_name TEXT,
signer_title TEXT,
signature_data TEXT,
signed_file_url TEXT,
terms_text TEXT,
terms_accepted BOOLEAN,
document_hash TEXT,
signed_ip TEXT,
signed_user_agent TEXT,
signed_at TIMESTAMPTZ,
viewed_at TIMESTAMPTZ,
revoked_at TIMESTAMPTZ,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.signature_policy (
document_type TEXT PRIMARY KEY,
mode TEXT,
updated_by_id TEXT,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.signature_request (
id TEXT PRIMARY KEY,
document_type TEXT,
document_id TEXT,
token_hash TEXT UNIQUE,
status TEXT,
expires_at TIMESTAMPTZ,
recipient_email TEXT,
recipient_phone TEXT,
signer_name TEXT,
signature_data TEXT,
signed_at TIMESTAMPTZ,
signed_ip TEXT,
signed_user_agent TEXT,
viewed_at TIMESTAMPTZ,
revoked_at TIMESTAMPTZ,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.final_settlement (
id TEXT PRIMARY KEY,
reference TEXT UNIQUE,
employee_id TEXT,
handover_id TEXT,
reason TEXT,
last_working_day TIMESTAMPTZ,
status TEXT,
currency TEXT,
total_additions DECIMAL,
total_deductions DECIMAL,
net_amount DECIMAL,
employer_contributions DECIMAL,
calculation JSONB
);

CREATE TABLE IF NOT EXISTS system.final_settlement_line (
id TEXT PRIMARY KEY,
settlement_id TEXT,
kind TEXT,
category TEXT,
label_en TEXT,
label_ar TEXT,
amount DECIMAL,
source TEXT,
details JSONB,
display_order INTEGER
);

CREATE TABLE IF NOT EXISTS system.calendar_feed_token (
id TEXT PRIMARY KEY,
user_id TEXT UNIQUE,
token_hash TEXT UNIQUE,
last_used_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.communication_settings (
id TEXT PRIMARY KEY,
managers_announce_to_team BOOLEAN,
updated_by_id TEXT,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.announcement (
id TEXT PRIMARY KEY,
reference TEXT UNIQUE,
title_en TEXT,
title_ar TEXT,
body_en TEXT,
body_ar TEXT,
category TEXT,
priority TEXT,
audience TEXT,
official BOOLEAN,
requires_acknowledgement BOOLEAN,
pinned BOOLEAN,
status TEXT,
publish_at TIMESTAMPTZ,
expires_at TIMESTAMPTZ,
published_at TIMESTAMPTZ,
created_by_id TEXT,
signed_by_id TEXT,
signature_url TEXT,
signed_at TIMESTAMPTZ,
decision_notes TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.announcement_receipt (
announcement_id TEXT,
user_id TEXT,
read_at TIMESTAMPTZ,
acknowledged_at TIMESTAMPTZ,
hidden_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system.letter_template (
id TEXT PRIMARY KEY,
key TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
subject_en TEXT,
subject_ar TEXT,
body_en TEXT,
body_ar TEXT,
about_employee BOOLEAN,
is_active BOOLEAN,
display_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.official_letter (
id TEXT PRIMARY KEY,
reference TEXT UNIQUE,
template_id TEXT,
employee_id TEXT,
recipient_name TEXT,
recipient_title TEXT,
recipient_organization TEXT,
recipient_address TEXT,
subject_en TEXT,
subject_ar TEXT,
body_en TEXT,
body_ar TEXT,
letter_date TIMESTAMPTZ,
classification TEXT,
show_signature BOOLEAN,
show_stamp BOOLEAN,
status TEXT,
created_by_id TEXT,
signer_id TEXT,
signature_url TEXT,
signed_at TIMESTAMPTZ,
verification_code TEXT UNIQUE,
decision_notes TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.warehouse (
branch_id TEXT,
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
address TEXT,
is_active BOOLEAN,
is_default BOOLEAN,
sort_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.wishlist_item (
id TEXT PRIMARY KEY,
customer_id TEXT,
catalogue_item_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.vehicle (
id TEXT PRIMARY KEY,
plate TEXT UNIQUE,
name TEXT,
kind TEXT,
notes TEXT,
is_active BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.route_sheet (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
date TIMESTAMPTZ,
driver_id TEXT,
vehicle_id TEXT,
status TEXT,
note TEXT,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.cod_settlement (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
driver_id TEXT,
agency_id TEXT,
expected DECIMAL,
received DECIMAL,
note TEXT,
settled_by_id TEXT,
settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system.courier_agency (
id TEXT PRIMARY KEY,
name TEXT,
kind TEXT
);

CREATE TABLE IF NOT EXISTS system.project (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name TEXT,
description TEXT,
status TEXT,
department_id TEXT,
owner_id TEXT,
color TEXT,
start_date TIMESTAMPTZ,
due_date TIMESTAMPTZ,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.service_settings (
id TEXT PRIMARY KEY,
sla_urgent_hours INTEGER,
sla_high_hours INTEGER,
sla_normal_hours INTEGER,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.canned_reply (
id TEXT PRIMARY KEY,
title TEXT,
body_en TEXT,
body_ar TEXT,
is_active BOOLEAN,
sort_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.broadcast (
id TEXT PRIMARY KEY,
name TEXT,
segment_id TEXT,
campaign_id TEXT,
subject_en TEXT,
subject_ar TEXT,
body_en TEXT,
body_ar TEXT,
status TEXT,
created_by_id TEXT,
queued_at TIMESTAMPTZ,
sent_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.broadcast_recipient (
id TEXT PRIMARY KEY,
broadcast_id TEXT,
customer_id TEXT,
email TEXT,
locale TEXT,
status TEXT,
error TEXT,
sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system.media_contact (
id TEXT PRIMARY KEY,
name TEXT,
outlet TEXT,
role TEXT,
beat TEXT,
email TEXT,
phone TEXT,
notes TEXT,
is_active BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.media_coverage (
id TEXT PRIMARY KEY,
title TEXT,
outlet TEXT,
url TEXT,
published_on TIMESTAMPTZ,
reach INTEGER,
sentiment TEXT,
article_id TEXT,
notes TEXT,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.legal_matter (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
title TEXT,
kind TEXT,
status TEXT,
counterparty TEXT,
reference TEXT,
next_date TIMESTAMPTZ,
assignee_id TEXT,
amount_at_stake DECIMAL,
description TEXT,
outcome TEXT,
created_by_id TEXT,
closed_at TIMESTAMPTZ,
reminded_for TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.legal_matter_event (
id TEXT PRIMARY KEY,
matter_id TEXT,
kind TEXT,
body TEXT,
by_id TEXT,
at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system.report_schedule (
id TEXT PRIMARY KEY,
report_key TEXT,
frequency TEXT,
format TEXT,
locale TEXT,
compare BOOLEAN,
owner_id TEXT,
is_active BOOLEAN,
next_run_at TIMESTAMPTZ,
last_sent_at TIMESTAMPTZ,
last_error TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.dashboard_layout (
user_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS system.serial_generation (
id TEXT PRIMARY KEY,
idempotency_key TEXT UNIQUE,
request_hash TEXT,
product_id TEXT,
variant_key TEXT,
batch_key TEXT,
location_id TEXT,
quantity INTEGER,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.package_content (
id TEXT PRIMARY KEY,
package_id TEXT,
product_id TEXT,
variant_key TEXT,
batch_key TEXT,
quantity DECIMAL
);

CREATE TABLE IF NOT EXISTS system.label_print_job (
id TEXT PRIMARY KEY,
idempotency_key TEXT UNIQUE,
request_hash TEXT,
template JSONB,
labels JSONB,
status TEXT,
original_job_id TEXT,
created_by_id TEXT,
confirmed_by_id TEXT,
confirmed_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.accounting_account (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name TEXT,
kind TEXT,
is_active BOOLEAN
);

CREATE TABLE IF NOT EXISTS system.accounting_period (
id TEXT PRIMARY KEY,
name TEXT UNIQUE,
starts_on TIMESTAMPTZ,
ends_on TIMESTAMPTZ,
status TEXT,
closed_by_id TEXT,
closed_at TIMESTAMPTZ
);

-- +goose Down