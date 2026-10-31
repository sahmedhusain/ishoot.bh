# Security and permission scope — 2026-10-30

## Verified boundaries

- New branch service reloads active actor and branch; non-super-administrators require an explicit branch grant.
- Inventory label operations require both branch access and inventory permission. Generation and reprint use authenticated-server actor arguments; no endpoint exposing caller-selected actor IDs has been added.
- Ledger services currently allow active super-administrators only. Delegated finance roles are intentionally not yet provisioned.
- The operations migration enables RLS and revokes `anon`/`authenticated` privileges on all 16 new tables. The database integration suite explicitly asserts active RLS on all 15 operational tables (`StockSerial`, `LabelPrintJob`, `JournalEntry`, `JournalLine`, `BranchGrant`, `RetailRegister`, `CashDrawer`, `CashierSession`, `RetailShift`, `RetailClosing`, `PaymentMethodConfig`, `PaymentCollection`, `CommissionRule`, `CommissionSnapshot`, `StoreRegion`).
- Database triggers reject modification or deletion of `RetailClosing` and `CommissionSnapshot` records, ensuring full legal and audit immutability.
- Branch-scoped authorization verified on forged warehouse, location, and count IDs, ensuring complete denial on nonexistent or inaccessible resources.
- Journal database triggers reject update/delete, late line insertion, empty/unbalanced journals and posting outside an open period.
- Website module lookup failure now denies access.
- Production isolation: `company/profiles/ishoot/` preserved strictly unmodified as the production profile; all multi-scenario expansions routed to `demo` profile and presets.
- Branch grant authorization enforced across regional store regions, retail registers, cash drawers, retail shifts, and 5-level closings (`requireBranchAccess(actorId, branchId, true)`).

## Release blockers

| ID / severity | Evidence / reproduction | Expected resolution | Status |
|---|---|---|---|
| SEC-001 High | Branch guards are only called by new services; legacy endpoints have not been exhaustively converted | Branch-constrained data access including searches/exports/downloads | Unverified platform-wide |
| SEC-002 High | Internal staff signatures bind to immutable manifest revisions; external signing-link service is still missing | Expiring/revocable, recipient-verified invitations bound to immutable manifest revisions | Missing |
| SEC-003 High | Server database owner bypasses RLS by design | Continue application authorization; verify all API role grants and service credential handling | Partial verification |
| SEC-004 High, fixed | Direct privileged writes previously bypassed period lifecycle checks | Added exclusion constraint and immutability triggers | Raw overlap/date-change/reopen/delete rejection tests pass |

The legacy security harness passes its denial tests. This does not establish absence of security issues across all modules, providers or deployment roles. No production credentials or provider settings were changed.

Cross-branch receiving is tested with a destination-only branch grant and explicit inventory overrides, with Products enabled. The test initially denied access while Products was disabled, as required by feature gating. Internal signature retries authenticate before returning stored evidence. External agency/driver identity verification is not implemented by these staff-only services.
