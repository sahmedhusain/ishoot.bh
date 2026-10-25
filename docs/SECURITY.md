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

- **Check domain** (Settings → Website) is the only place the server fetches an address someone typed. It needs
  `settings:edit`, accepts only a plain host name (no IP literal, port, credentials or `localhost`), resolves it and
  refuses private, loopback and link-local addresses, fetches only `https://<host>/api/health` with an 8-second
  timeout and no redirects, and reports a state, never the response body. `/api/health` returns the app name and a
  hash of the company record's id, nothing else.

## Website custom code and embeds

- Custom-code blocks and site-wide code need `cms_code:edit` (owner and administrators by default). Adding or
  changing them is refused without it, even through the general website save, and every change is written to the
  audit log with the code itself.
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

## Data protection

- Integration credentials (WhatsApp, Facebook and others) are encrypted with AES-256-GCM using `ENCRYPTION_KEY`.
- Uploads are checked by their real content, not their file name, and SVG is never accepted. Brand fonts must be WOFF2.
- Themes are normalised before they reach CSS: colours must be `#RRGGBB`, and font names must be plain letters, digits and spaces.

## Retention

Implemented:
- Expired sessions are removed by maintenance.
- Unclaimed **private** uploads expire after 24 hours. Each maintenance pass removes up to 25 of them from storage, then from the database. Claimed files are kept, and storage failures leave the record for a retry.
- Abuse-limit windows older than their expiry plus one day are removed.
- Each message keeps at most 100 recent verified delivery events.

Targets that still need an approved, reviewed job and a tested backup and restore:
- Purge orphaned claimed private files after 30 days.
- Purge successful email bodies and attachment bytes after 30 days, keeping evidence of provider acceptance.
- Aggregate social analytics after 90 days and remove the raw entries.
- Remove expired unclaimed public brand uploads, which the private sweep does not cover.

Audit logs, issued financial documents and accepted email evidence are retained.
