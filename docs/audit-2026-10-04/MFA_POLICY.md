# MFA and Recovery Policy

## Mandatory MFA
- Multi-Factor Authentication (MFA) must be enabled for all users with the `admin` role or any role granting `write` or `delete` access to CRM, Finance, or User Management modules.
- New privileged accounts will have a 7-day grace period to enroll in MFA before their access is restricted to the setup page.

## Lost-All-Codes Recovery
- Users who lose their authenticator app and all recovery codes must contact a Super Admin.
- The Super Admin will verify the user's identity via a video call or in-person meeting.
- Upon verification, the Super Admin will temporarily disable MFA for the user's account and mandate immediate re-enrollment.
- A mandatory audit log entry must be recorded for this administrative action.

## Privileged Accounts
- `super_admin` accounts cannot have their MFA disabled by any other user.
- If a `super_admin` loses all access, recovery requires manual database intervention by the infrastructure team with approval from the company director.
