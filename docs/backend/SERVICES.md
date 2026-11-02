# Services

Each service has its own README with endpoints, events, tables, configuration and a runbook.

| Service                                               | Owns                                                                                                                  | Status                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| [gateway](../../backend/services/gateway/README.md)   | Routing, token check, rate limits (no data)                                                                           | Live                   |
| [identity](../../backend/services/identity/README.md) | Staff, customer and IT accounts; sessions, refresh tokens, MFA; roles, permissions, data scopes; Google/Apple sign-in | IT realm live; Phase 3 |
| [system](../../backend/services/system/README.md)     | Company settings, modules, integrations (encrypted credentials), domains, runtime configuration                       | Modules, integrations, domains and site code live; Phase 4 |
| [files](../../backend/services/files/README.md)       | Upload records, streamed S3 bytes, type and size checks, River cleanup                                                | Phase 2 verification   |
| [notify](../../backend/services/notify/README.md)     | E-mail and WhatsApp delivery with retries and IT's queue; in-app notifications and broadcasts later                    | Live (delivery)        |
| [audit](../../backend/services/audit/README.md)       | The audit trail: every published event, append-only, searched from the IT dashboard                                  | Live (system events)   |
| workflow                                              | Approval engine, signatures, documents, letters, minutes, tasks, calendar, legal, report schedules                    | Phase 6                |
| cms                                                   | Website content, pages, articles, publication, website revalidation                                                   | Phase 6                |
| sales                                                 | Inquiries and service desk, CRM, quotations, commissions, outreach, marketing                                         | Phase 6                |
| finance                                               | Invoices, payments, expenses, taxes, accounting journal, numbering                                                    | Phase 6                |
| hr                                                    | Employees, leave, attendance, payroll, social insurance, settlements, handovers, claims                               | Phase 6                |
| inventory                                             | Products, stock ledger, serials, counts, transfers, procurement, company assets                                       | Phase 6                |
| commerce                                              | Store, customers' orders, coupons, payment gateways, retail                                                           | Phase 6                |
| delivery                                              | Delivery settings, shipments, courier adapters, fleet, cash on delivery                                               | Phase 6                |
| [itsm](../../backend/services/itsm/README.md)         | IT tickets, categories and SLAs, system-health view for the IT dashboard                                              | Phase 5                |

The IT dashboard ([apps/it](../../apps/it/README.md)) is the IT team's front end for these services.

Every service exposes the same admin endpoints on port 9090: `/livez`, `/readyz`, `/metrics`,
`GET|PUT /runtime/log-level` and, when `ADMIN_ENABLE_PPROF=true`, `/debug/pprof/`.
