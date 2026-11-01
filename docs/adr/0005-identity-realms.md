# 0005 — One identity service with three separate realms

- Status: Accepted (2026-11-01)

## Decision

- The `identity` service holds three separate account realms: `staff` (employees, admin app), `customer` (website) and `it` (IT dashboard). Each realm has its own tables, cookie, token audience and rate limits; an account in one realm cannot sign in to another.
- Identity issues short-lived EdDSA access tokens and rotating refresh tokens (stored hashed, reuse detected) and publishes its signing keys at a JWKS endpoint. The gateway and services verify tokens locally against JWKS.
- Passwords are hashed with argon2id; existing bcrypt hashes are accepted and replaced at the next sign-in.
- TOTP MFA is optional for staff and customers and mandatory for the `it` realm, which can also be limited to an IP allow-list.
- Services call each other with short-lived service tokens issued by identity.

## Consequences

- IT operators are fully isolated from employee accounts, as requested.
- Existing staff sessions end at cut-over; users sign in once again.
