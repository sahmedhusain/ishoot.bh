# Security and data policies

## Authentication and sessions

- Sign-in uses a signed session cookie backed by a stored, revocable session. Passwords are hashed with bcrypt, must be 12 to 72 bytes, and are rate-limited per account. Every sign-in is written to the activity log.
- Changing or resetting a password revokes every session and any pending reset or invitation.
- Users can see their active devices and revoke one or all other sessions from their profile.

## Multi-factor authentication

- Authenticator (TOTP) setup shows a QR code and setup key, and ten single-use recovery codes that can be copied or downloaded once. Enabling or disabling MFA revokes all sessions.
- **Policy (not yet enforced by the app):** MFA is required for `admin` and for any role that can write or delete in CRM, finance or user management, with a 7-day grace period for new privileged accounts. Today, enrolment is voluntary, and administrators must check it.
- **Lost authenticator and all recovery codes:** a Super Admin verifies the person's identity in person or by video call, temporarily disables MFA for that account and requires immediate re-enrolment. The action is recorded in the audit log.
- A `super_admin`'s MFA cannot be disabled by another user. If a Super Admin loses all access, recovery needs manual database work by the infrastructure team, approved by the company director.
- Keep `MFA_ENCRYPTION_KEY` stable. Rotating it invalidates every stored authenticator.

## Authorization

- Every server action, and every API route except the deliberately public ones (website inquiry and reviews, one-time signing and acknowledgement links), checks `resource:action` permissions (`requirePermission`) before reading or changing data. Roles and grants are edited in Settings → Roles.
- The last active Super Admin cannot be suspended, archived or deleted.
- Files are served only to people allowed to see the record they belong to. Public brand files (logos, icons, fonts) are the only public uploads.

- **Check domain** (setup wizard; IT dashboard → Website) is the only place the server fetches an address someone
  typed. It needs `settings:edit` in the admin or `domains:execute` in the IT dashboard, accepts only a plain host name (no IP literal, port, credentials or `localhost`), resolves it and
  refuses private, loopback and link-local addresses, fetches only `https://<host>/api/health` with an 8-second
  timeout and no redirects, and reports a state, never the response body. `/api/health` returns the app name and a
  hash of the company record's id, nothing else.

## Website custom code and embeds

- Custom-code blocks need `cms_code:edit` (owner and administrators by default). Adding or changing them is
  refused without it, even through the general website save, and every change is written to the audit log with the
  code itself.
- Site-wide analytics ids and head/body code belong to IT: the system service stores them, and only IT accounts
  with `site_code:edit` change them (IT dashboard → Website). The service checks the ids and caps each code field at
  50,000 characters, and records who changed them last.
- Custom code always runs in a sandboxed iframe (`srcdoc`, `sandbox="allow-scripts allow-popups allow-forms"`, no
  `allow-same-origin`): it cannot read the website's cookies, storage or DOM, or call its APIs as the visitor. The
  frame reports its height with `postMessage`; the page accepts only messages from that frame. There is no
  "trusted inline script" mode. Site-wide head and body code runs in a hidden frame of the same kind.
- Analytics are not free-form code: the company enters a Google Analytics, Meta Pixel or TikTok Pixel id, checked
  against a strict pattern, and the website builds the official tag around it.
- Embeds (YouTube, Vimeo, Instagram, Google Maps, Calendly, Typeform) load only https addresses on each provider's
  own hosts (`embedSource` in `packages/database/src/cms/blocks.ts`).
- Article and rich-text HTML is built on the server from the editor's document (never taken from the browser) and
  cleaned with an allow-list (`apps/admin/lib/rich-text/render.ts`): formatting, links (`rel="noopener noreferrer
nofollow"`), images, tables and frames for the embed providers only; scripts, event handlers and other schemes
  are dropped. Code blocks and site code are previewed through the normal signed draft preview before publishing.

## Customer accounts (online store)

- Customers are a separate account type from staff (`Customer`); a customer session never opens the admin.
- Passwords are bcrypt-hashed (cost 12); a missing account is compared against a fixed hash so response timing
  does not reveal which e-mails exist. Sessions are random 256-bit tokens stored only as SHA-256 hashes, in an
  HttpOnly, SameSite=Lax cookie, for 7 days by default.
- E-mailed sign-in codes are six digits, stored hashed, valid 10 minutes, at most 5 attempts, one live code per
  e-mail; sending is limited per e-mail and per address, as are password sign-ins and sign-ups.
- Account API posts must come from the website's own origin.
- Google and Apple use the authorization code flow with PKCE (S256), a random state and nonce kept in a signed,
  10-minute cookie (`CUSTOMER_AUTH_SECRET`), and ID tokens verified against the provider's published keys,
  audience, issuer, expiry and nonce. An existing account is linked only when the provider confirms the e-mail.
- "Delete my account" removes sessions, addresses, wishlist, sign-in methods, name and e-mail; orders are kept
  without the personal details.

## Online payments

- Card details never reach the platform: every gateway is used through its hosted payment page (Stripe Checkout,
  Tap, PayPal, Checkout.com Hosted Payments, PayTabs, Moyasar invoices) or its hosted card frame (HyperPay
  COPYandPAY, loaded with the integrity hash HyperPay returns).
- Gateway keys are integration credentials (AES-256-GCM with `ENCRYPTION_KEY`); the browser only ever sees the
  last characters of a secret.
- Whether an order is paid is always asked of the gateway (on the customer's return and from webhooks), never
  read from the browser. Webhooks are verified per gateway: Stripe's timestamped HMAC (5-minute window), Tap's
  hashstring, Checkout.com's and PayTabs' body HMAC, Moyasar's secret token, PayPal's verify-signature API and
  HyperPay's AES-GCM encryption; anything else is refused with 401.
- Each webhook delivery is stored (`PaymentWebhookEvent`) so a retry changes nothing, and moving a payment attempt
  to paid is a guarded update, so the webhook and the customer's return record the money once.
- Payment links are `orderId.HMAC` (`CUSTOMER_AUTH_SECRET`, falling back to `REVALIDATION_SECRET`): a link pays
  what is owed on that one order and shows nothing else about the customer.
- Unpaid online orders release their stock after `ONLINE_PAYMENT_TIMEOUT_MINUTES` (the scheduled job asks the
  gateway once more before giving up).
- `PAYMENT_GATEWAY_BASE_URL_<GATEWAY>` points a gateway at another API host; it exists for local sandboxes and the
  end-to-end tests and must be unset in production.

## Data protection

- Integration credentials (WhatsApp, Facebook and others) are encrypted with AES-256-GCM using `ENCRYPTION_KEY`.
- Uploads are checked by their real content, not their file name, and SVG is never accepted. Brand fonts must be WOFF2.
- Themes are normalised before they reach CSS: colours must be `#RRGGBB`, and font names must be plain letters, digits and spaces.

## Retention

Implemented:

- Expired sessions are removed by maintenance.
- Unclaimed **private** uploads expire after 24 hours. Each maintenance pass removes up to 25 of them from storage, then from the database. Claimed files are kept, and storage failures leave the record for a retry.
- Private proof photos from erased orders are deleted when no remaining shipment references them; a failed files-service request leaves the erasure event retryable.
- Successful email recipient details, bodies and attachments are scrubbed after 30 days; provider delivery evidence remains.
- Abuse-limit windows older than their expiry plus one day are removed.
- Each message keeps at most 100 recent verified delivery events.

Targets that still need an approved, reviewed job and a tested backup and restore:

- Purge orphaned claimed private files after 30 days.
- Purge successful email bodies and attachment bytes after 30 days, keeping evidence of provider acceptance.
- Aggregate social analytics after 90 days and remove the raw entries.
- Remove expired unclaimed public brand uploads, which the private sweep does not cover.

Audit logs, issued financial documents and accepted email evidence are retained.
