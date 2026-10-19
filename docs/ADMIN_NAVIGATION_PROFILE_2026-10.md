# Admin navigation and account improvements

These changes are implemented in the local checkout; no deployment or database migration is required for this update.

## Navigation

The sidebar groups destinations into Workspace, Sales & clients, Production & operations, Finance & accounting, People & payroll, My requests, Communications & documents, Website & marketing and Administration. Workspace leads for every role. Finance follows for accountants, Sales for sales staff, Production for production staff, Website & marketing for marketing, and People & payroll for administrators. Custom permissions and enabled modules determine which links are visible; role priority never grants access. Governance settings retain their server-enforced super-administrator restriction.

Categories collapse individually and remember each user's choices on the current browser. Nested destinations highlight their most specific matching link. Profile is available through the account menu, alongside Password & security, Appearance and Sign out.

## Notifications

The dropdown shows eight recent messages, All/Unread filters, an exact unread count across the whole visible inbox, read/unread and hide actions, mark-all-read, contextual record links and a link to the full inbox. It refreshes when opened, when the browser becomes visible and every 30 seconds while visible. Loading, empty and retry states are localized. The account and notification menus dismiss outside or on Escape, restore focus on Escape and never remain open together.

## Profile and account security

The profile contains personal/contact details, work and reporting-manager details, personal edit history, signature, assigned assets and account security. Phone changes save immediately and can clear an old number. Name/email and stored-signature changes use the existing configurable approval process. Pending identity requests can be opened or withdrawn; forms allow cancelling unsaved edits.

Password changes verify the existing password, enforce 12 characters and a maximum of 72 UTF-8 bytes, reject the same password and require a valid second factor when MFA is enabled. Successful changes revoke every session and pending reset/invitation challenge. Passwords and session token hashes are never returned to the profile client.

Authenticator setup includes a locally generated QR code, manual setup key, confirmation code and ten single-use recovery codes that can be copied or downloaded immediately after setup. MFA changes revoke all sessions and ask the user to sign in again. Keep the existing 32-byte base64 MFA_ENCRYPTION_KEY configured and stable; replacing it would invalidate stored authenticator secrets. The legacy Security settings URL redirects to the profile security section.

Users can inspect active devices and revoke individual other sessions or every other session. The current device is always included and is ended through Sign out.

## Verification

The admin production build passed. Type checking, focused lint, localization checks and generated action-schema checks passed. Real-component navigation tests cover both languages, role priorities, custom permissions, module visibility, unique destinations and nested-page matching. Local database tests cover password verification, MFA/recovery codes, session ownership/revocation, identity validation and exact notification counts; all test changes roll back. Communications and every approval-type regression also passed.

Signed-in browser interaction and visual checks remain outstanding. No authentication bypass or temporary token reuse was used.
