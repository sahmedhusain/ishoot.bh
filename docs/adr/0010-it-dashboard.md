# 0010 — A separate IT dashboard and IT ticketing for employees

- Status: Accepted (2026-11-01)

## Decision

- A new Next.js app, `apps/it`, built from the same UI packages as the admin app, is the only place for system administration: service health, logs, runtime log levels and debug flags, jobs, database health, integrations, domains, modules, staff accounts and roles, audit and sessions, the setup wizard, IT accounts and backups.
- Those pages and actions are removed from the admin app, which remains for employees' daily work.
- The new `itsm` service holds IT tickets. Employees raise and follow tickets from a new "IT support" area of the admin app (categories: hardware and devices, access and accounts, software and licences, network and email; categories and SLAs are data, editable by IT). IT works the queue in the IT dashboard.
