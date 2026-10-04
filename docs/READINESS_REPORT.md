# Deployment readiness

The repository passes source, build and disposable-database checks recorded in [the October 4 audit](audit-2026-10-04/REPORT.md). These checks do not certify the configured environment or a production deployment.

Run `pnpm check:deployment` with the intended server environment before deploying. The audit environment currently fails database pool limits, MFA encryption key, server storage URL, integration encryption key, cron secret, webhook signing secret and email-provider configuration checks.

New uploads use Supabase signed uploads, server-verified metadata and authenticated finalization. Private downloads require application authorization before issuing short-lived signed URLs. Both maintenance entry points remove expired private objects before removing their database rows. Legacy disk readers remain for installations that have not configured cloud storage; existing disk objects require an explicit migration.

Set up `private-assets` as a private bucket and `public-assets` for public branding only. Enforce a 10 MiB file limit and allowed MIME types at the bucket level. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server. Set `CRON_SECRET` and schedule the authenticated maintenance route, or run the standalone workers on a durable host. Bucket policy, scheduler execution and provider delivery were not exercised against live services.

Set a separate 32-byte UTF-8 `ENCRYPTION_KEY` for integration credentials and a `RESEND_WEBHOOK_SECRET` for delivery webhooks. Saved credentials are not proof of provider connectivity. Resend delivery events are signature-verified; inbound email ingestion is not implemented. Outbound meeting email uses the existing retry outbox, whose failure and concurrency behavior is covered by integration tests.

Configure provider-supported database pooling, TLS, backups and storage durability; test restore procedures. Production latency, field Core Web Vitals, quotas and mail-domain verification remain operational checks. Current plan limits and backup capabilities must be verified with the deployed provider and subscription.
