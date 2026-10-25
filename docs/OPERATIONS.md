# Operations: environment, services and deployment

## Environment variables

Copy `.env.example` to `.env`. Both apps, the workers and the scripts read the root `.env`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres for the apps. In production use the provider's connection pooler (for example port 6543) and set `connection_limit` and `pool_timeout` |
| `DIRECT_URL` | yes | Direct Postgres connection, used for migrations |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | production | Server-side file storage. If empty, files are stored on disk under `UPLOAD_ROOT` (development or a single server only) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | | Public Supabase values |
| `UPLOAD_ROOT` | disk mode | Absolute upload folder; defaults to `apps/admin/private/uploads` in development |
| `COMPANY_PROFILE` | | Profile loaded by `db:seed`, `db:reset` and `db:bootstrap`. Leave empty in production to use the setup wizard |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`, `SUPER_ADMIN_PHONE` | bootstrap | First administrator (password 12 to 72 bytes) |
| `WEB_URL`, `ADMIN_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_ADMIN_URL` | yes | Public addresses of each app; the admin previews website media from `NEXT_PUBLIC_WEB_URL` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | | `ar` or `en` |
| `JWT_SECRET` | yes | Session signing, at least 32 bytes |
| `REVALIDATION_SECRET` | yes | Shared by the admin and website for publishing website changes |
| `MFA_ENCRYPTION_KEY` | yes | Exactly 32 random bytes, base64 encoded. Keep it stable: changing it invalidates every authenticator |
| `ENCRYPTION_KEY` | yes | 32 bytes, encrypts saved integration credentials |
| `RESEND_API_KEY`, `FROM_EMAIL`, `NOTIFICATION_EMAIL` | email | Outbound email through Resend |
| `RESEND_WEBHOOK_SECRET` | email | Verifies delivery webhooks |
| `CRON_SECRET` | production | Authenticates the scheduled maintenance route |
| `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | | Optional defaults for integrations (normally saved, encrypted, in Settings → Integrations) |
| `FX_API_URL`, `FX_LIVE_DISABLED` | | Live exchange rates for BHD (defaults to open.er-api.com) |
| `OBSERVABILITY_ENABLED`, `TRUSTED_CLIENT_IP_HEADER` | | Operation timing logs; the header your proxy sets with the real client IP |

Generate secrets with `openssl rand -base64 32`.

## Local services

| Service | Address | Notes |
|---|---|---|
| Website | http://localhost:3000 | `pnpm dev:web` |
| Admin | http://localhost:3001 | `pnpm dev:admin` |
| Postgres (local Supabase) | 127.0.0.1:54322 | See [DATABASE.md](DATABASE.md) |
| Supabase API and storage | http://127.0.0.1:54321 | `pnpm db:reset` creates the buckets |
| Prisma Studio | http://localhost:5555 | `pnpm db:studio` |

**Testing email without a verified domain:** create a free Resend account and API key, then set `NOTIFICATION_EMAIL` to the address you signed up with. Resend only delivers test mail to that address.

## External services

**Supabase (database and storage).** The apps connect through Prisma. Uploads go straight from the browser to storage using short-lived signed URLs; the server checks type, size and permission first and verifies the stored bytes when the upload is claimed. Two buckets:

| Bucket | Visibility | Contents |
|---|---|---|
| `public-assets` | public | Logos, icons, brand fonts (WOFF2), website media |
| `private-assets` | private | Everything else; downloads need application permission and a short-lived signed URL |

Limit both to 10 MiB, with PDF, PNG, JPEG and WebP, plus WOFF2 on `public-assets`.

**Resend (email).** Messages are saved as queued before they are sent, so a failure is retried instead of lost. Delivery events arrive at `/api/webhooks/resend`, verified with `svix` signatures and de-duplicated. Inbound email is not implemented.

**WhatsApp and Meta.** Salary documents can be sent as private PDFs through the WhatsApp Cloud API (uploaded by media ID, never as a public link). Social metrics for the dashboard are cached in `SocialMetric` with the time they were recorded, and flagged when stale or failing.

**PDF documents.** `@react-pdf/renderer` builds invoices, quotations, receipts, payslips, certificates, letters and handover forms in Node. It uses the company's colours and its body font: an uploaded WOFF2, or the Google font in TrueType. If neither is available it falls back to Helvetica.

## Background work

| Process | Command | Purpose |
|---|---|---|
| Email worker | `pnpm worker:email` | Sends queued email, retries failures |
| Revalidation worker | `pnpm worker:revalidation` | Pushes published website changes to the website (needs `WEB_URL`, `REVALIDATION_SECRET`) |
| Maintenance worker | `pnpm worker:maintenance` | Removes expired sessions, abuse windows and unclaimed private uploads |

On serverless hosting, schedule the authenticated maintenance route (`/api/cron`, with `CRON_SECRET`) instead of running the maintenance worker. `pnpm check:workers` verifies the worker configuration.

## Domains

The setup wizard (Website step) and Settings → Website ask for the public website's domain and, optionally, an
admin domain. They are stored on the company (`CompanySetting.websiteDomain`, `adminDomain`) and used for the
website's canonical address, sitemap and page metadata, password-reset links, signing links, calendar feeds and
PDF links. `WEB_URL` and `ADMIN_URL` (or `ADMIN_APP_URL`) still win when they are set.

The app never changes DNS. Add one record at the registrar:

| Hosting | Domain | Record |
|---|---|---|
| Vercel | `example.com` (apex) | `A @ 76.76.21.21` |
| Vercel | `www.example.com`, `admin.example.com` | `CNAME www cname.vercel-dns.com` |
| Your own server | any | `A <name> <server IP address>`, with the reverse proxy routing the domain to the app's port |

Then add the domain to the hosting project and press **Check domain**: the admin fetches
`https://<domain>/api/health`, which answers with the app and a fingerprint of this installation, and reports
whether the domain reaches this installation.

## Deploying

1. Create the database and both storage buckets; configure pooling, TLS and backups.
2. Set the environment variables above on every app and worker.
3. Run `pnpm check:deployment` with the production environment. It reports missing pool limits, keys, storage, cron and email settings.
4. Run `pnpm db:migrate`.
5. Run `pnpm db:bootstrap` once, without `COMPANY_PROFILE` to use the setup wizard, or with a reviewed profile.
6. `pnpm build`, then start both apps and the workers.
7. Sign in and finish setup. Then check Settings → Integrations for email and WhatsApp.

**Upgrading an installation from before company profiles:** after migrating, run `COMPANY_PROFILE=<name> COMPANY_PROFILE_OVERWRITE=1 pnpm db:bootstrap`. This restores the company's theme and fonts and moves stored `/brand/...` file paths to uploads (see [GETTING_STARTED.md](GETTING_STARTED.md#re-apply-a-profile-to-an-existing-installation)). Everyone signs in again once, because the session cookie was renamed.

Back up the database and both buckets together; stored file URLs point into storage. Restores, provider quotas, mail-domain verification and production latency need checking against the live environment; the test suites do not certify them.
