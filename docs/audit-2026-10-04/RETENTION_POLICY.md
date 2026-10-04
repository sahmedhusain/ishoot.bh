# Retention Policy

## Sessions
- Inactive user sessions expire automatically after 7 days.
- Revoked sessions are hard-deleted immediately during password resets or security events.

## Uploads
- Pending uploads (unclaimed attachments) are purged after 24 hours.
- Orphaned private files are soft-deleted and purged after 30 days.

## Email Evidence
- Sent email records (status, timestamp, recipient) are kept indefinitely for audit purposes.
- Email body/attachments in the delivery queue are purged 30 days after successful delivery.

## Analytics & Audit Records
- Audit logs are retained indefinitely.
- Immutable snapshots (e.g. Quotations, Issued Invoices) are retained indefinitely.
- Social analytics raw data is aggregated after 90 days and raw entries are purged.
