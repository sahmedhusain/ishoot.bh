# Admin activity matrix

Which admin screens each business activity needs, the module (`FeatureToggle`) that switches them off and the
permission that guards them. Written for platform v2 phase 1 (2026-10-26). "All" means every activity in
`packages/database/src/website-presets.ts`. A module that has no toggle row counts as on (`isFeatureEnabled`).

Module gating works in two places: the sidebar hides an item whose module is off, and `getEffectivePermissions`
drops every permission of a resource whose module is off (`RESOURCE_FEATURES`), so the page guard answers 403.
Pages with no page permission show only the signed-in person's own records (their approvals, notifications,
profile, team) or check access per record.

## Workspace and communications

| Route | Activities | Module | Permission |
|---|---|---|---|
| `/dashboard` | All | none | signed in; panels follow each permission |
| `/dashboard/approvals`, `/approvals/[type]/[id]` | All | none | per approval type (`readableApprovalTypes`) |
| `/dashboard/notifications` | All | none | own notifications |
| `/dashboard/announcements`, `/[id]`, `/new` | All | none | `announcements:*` checked in the view and actions |
| `/dashboard/letters`, `/[id]`, `/new`, `/templates` | All | none | `letters:read` / `letters:create` |
| `/dashboard/directory` | All | none | signed in (staff directory) |
| `/dashboard/team` | All | none | managers only (people who manage a team) |
| `/dashboard/archive` | All | none | per document (`archive-access.ts`) |
| `/dashboard/calendar` | All except online store | `calendar` | `calendar:read` |
| `/dashboard/profile` | All | none | own profile |

## Sales and customers

| Route | Activities | Module | Permission |
|---|---|---|---|
| `/dashboard/crm/deals`, `/[id]`, `/[id]/edit`, `/new` | All except food, healthcare, online store, pharmacy (off by default, can be switched on) | `crm_deals` | `deals:read` / `deals:write` |
| `/dashboard/settings/pipeline` (new) | Every activity with deals | `crm_deals` | `settings:read`, edit with `settings:edit` |
| `/dashboard/crm/contacts`, `/crm/customers/*` | All | `crm_deals` | `contacts:read` / `contacts:write` |
| `/dashboard/crm/leads` | All | `crm_deals` | redirects to the request inbox (website enquiries) |
| `/dashboard/requests`, `/[id]`, `/new` | All | `crm_deals` | `requests:read` / `requests:write` |
| `/dashboard/moms`, `/[id]`, `/new` | Service activities (media, agency, services, construction, events, law firm, IT) | `crm_deals` | `moms:read` / `moms:write` |
| `/dashboard/quotations`, `/[id]`, `/new` | All except food and online store | `invoicing` | `quotations:read` / `quotations:create` |
| `/dashboard/services` | All | none | `invoices:read` |

## Finance

| Route | Activities | Module | Permission |
|---|---|---|---|
| `/dashboard/invoices`, `/[id]`, `/[id]/edit`, `/new` | All | `invoicing` | `invoices:read` / `invoices:write` |
| `/dashboard/payments`, `/[id]`, `/new` | All | `invoicing` | `payments:read` / `payments:write` |
| `/dashboard/expenses`, `/new`, `/categories`, `/recurring` | All | `invoicing` | `expenses:read` / `expenses:write` |
| `/dashboard/finance` | All | `invoicing` | `finance_analytics:read` |
| `/dashboard/finance/reports`, `/finance/commissions` | All | `invoicing` | `reports:read` |
| `/dashboard/claims`, `/new` | All | none | `self_service:read` / `self_service:create` |

## People

| Route | Activities | Module | Permission |
|---|---|---|---|
| `/dashboard/hr/employees`, `/[id]`, `/new` | All | `hrms` | `employees:read` / `employees:create` |
| `/dashboard/hr/attendance`, `/requests`, `/handovers`, `/settings` | All | `hrms` | `employees:read` |
| `/dashboard/hr/leave`, `/hr/documents` | All | `hrms` | `self_service:read` |
| `/dashboard/hr/payroll`, `/items/[id]`, `/gosi`, `/supports`, `/settlements/*` | All | `payroll` | `payroll:read` / `payroll:create` |
| `/dashboard/hr` | All | `hrms` | redirects to the employee list |
| `/dashboard/users`, `/new` | All | none | `users:read` / `users:write` |

## Operations

| Route | Activities | Module | Permission |
|---|---|---|---|
| `/dashboard/assets`, `/[id]`, `/new`, `/categories`, `/handovers/[id]` | All | none | `assets:read` / `assets:create` / `assets:edit` |
| `/dashboard/cms/equipment` | Media and events (rental equipment) | `equipment` | `equipment:read` |
| `/dashboard/company/documents`, `/new` | All | none | `settings:read` / `settings:write` |

## Website content

| Route | Activities | Module | Permission |
|---|---|---|---|
| `/dashboard/cms/website` | All with a website | `cms` | `settings:read` |
| `/dashboard/cms/portfolio` (catalogue: works, products, menu, listings…) | All with a website | `cms` | `portfolio:read` |
| `/dashboard/cms/banners`, `/faqs`, `/stats`, `/clients` | All with a website | `cms` | `banners` / `faqs` / `stats` / `clients` `:read` |
| `/dashboard/cms/reviews` | All with a website | `reviews` | `reviews:read` |
| `/dashboard/analytics` (social) | All with social accounts | none | `social:read` |

## Administration

| Route | Activities | Module | Permission |
|---|---|---|---|
| `/dashboard/settings`, `/preferences`, `/security` | All | none | signed in (own preferences and security) |
| `/dashboard/settings/company`, `/web`, `/modules` | All | none | `settings:read` |
| `/dashboard/settings/approvals` | All | none | `settings:read`, super administrators in the sidebar |
| `/dashboard/settings/integrations` | All | none | `settings:edit` or `calendar:read` (calendar sync) |
| `/dashboard/settings/roles` | All | none | `users:read`, super administrators in the sidebar |
| `/dashboard/settings/audit` | All | none | `audit_logs:read` |

## Screens that assumed a media company, and what changed

| Screen | Assumption | Fix |
|---|---|---|
| Deals board, deal forms, deal filters, dashboard pipeline panel | Hard-coded film stages (`production`, `post_production`) | Per-company pipeline (`DealPipelineStage`), seeded from the activity, edited in Settings → Sales pipeline. Stored stage ids did not change. |
| Integrity check "deal stage is not behind its documents" | Fixed stage ranks | Uses each company's stage order. |
| Deal "shoot date", calendar titles, equipment wording | Film words | Already neutral (admin-wording work); the media overlay keeps the film wording. |
| Equipment screens | Shown to every company | Behind the `equipment` module, recommended only for media and events. |
| User departments, request teams, service categories | Film departments (`production`, `post_production`) as fixed lists | Phase 2 replaces them with the company's departments. |
