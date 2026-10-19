# Admin workflows implemented in October 2026

The changes are available in the local checkout. Database migrations have been applied to the local development database. Production deployment still requires the normal migration and release process.

## Documents and approvals

- Salary slips omit attendance statistics. Employee self-service salary documents hide sharing controls.
- The current user's profile is separate from change approvals. Approval links open the specific request, with its subject, before/after values, files and decision controls.
- Generated documents have independent Arabic and English view, download and print actions. The interface language does not select the only available document language.
- Document fields support a registered upload or an HTTPS link, including VAT certificates.
- Asset checklist answers are explicit yes/no values; asset condition and condition notes are recorded separately.
- Asset handovers can issue an expiring, revocable, single-use employee signing link. The employee reviews the handover and signs outside the admin dashboard.
- Signature settings select saved or freshly drawn signatures by document type. A live signature requires an explicit decision, including for Super Admin; automatic approval cannot silently apply a saved signature.
- The company archive offers printable blank letterhead and includes issued official letters and final settlements.

## HR and payroll

Social insurance settings contain dated component rates, eligible categories, wage bases, ceilings and service bands. Employee registrations have effective dates, declared wages, rate/exemption overrides and an optional declared wage per component. The latter can represent basic salary plus a social allowance without applying gross pay to every component. GCC employees require their home-country scheme to be configured individually.

The first-of-month rule charges a full contribution month when the employee is employed on the first, including someone leaving that day. A joiner after the first does not owe that month's contribution. Pension and unemployment deductions remain separate lines. Approved payroll retains its calculation snapshot.

Support programmes have dated rules, percentage schedules, supported salary caps by qualification, payment caps, proration and employee approval status. Applied, rejected and suspended support does not contribute to current payroll. Partial approval can specify a percentage or fixed amount. Qualification caps limit the salary before applying the percentage: a BHD 800 wage cap at 70% gives BHD 560, subject to any separate reimbursement cap. Support cannot exceed the employer cost booked in payroll. Claim intervals are recorded in payroll snapshots rather than assumed to be six months for every programme.

Final settlements include approved unpaid payroll, missing months within recorded payroll history, outstanding commission, approved reimbursement claims, unused leave, employer indemnity where applicable, recurring additions/deductions and remaining recoveries. Calculated rows and manual adjustments are separate; recalculation keeps manual rows. Salary records effective for each month are used. There is no six-month truncation.

Service before the earliest payroll record is flagged for HR review: historical payments may predate adoption of the system. Add verified older unpaid amounts as manual settlement rows. Payroll awaiting approval and recoveries without an end date also require review. Settlement payment rejects an included salary, claim or commission balance that has changed since calculation; cancel and reissue the settlement with current amounts. Paying records commission in the monthly payout ledger and closes included claims and salaries atomically.

The original HR presets are corrected by a follow-up migration, rather than rewriting an applied migration. Company-entered contribution rules remain editable. Support presets are examples; employee-approved terms determine actual support.

### Financial rule sources

- [Bahrain Law 14/2022](https://lloc.gov.bh/Legislation/HTM/K1422): the pension contribution schedule is represented as separate dated rows. Annual employer rates through 2028 are derived from the statutory annual increment.
- [SIO salary submission guide](https://www.sio.gov.bh/reports/pdf/SIO_Salary_English): end-of-service contributions use basic salary and social allowance rather than all allowances.
- [Labour Law 36/2012, Article 116](https://lloc.gov.bh/Legislation/HTM/K3612): employer indemnity includes fractions of a year. The default one-year exclusion has been removed.
- [Tamkeen annual plan](https://www.tamkeen.bh/wp-content/uploads/2024/03/EN-2024-Annual-Plan-Final.pdf): private-sector employer unemployment contributions are funded by Tamkeen.

## Calendar and communications

Calendar subscriptions are configured alongside social integrations, with a link from Calendar. Each employee has a revocable personal subscription URL. Manual events support private, team, department, company and selected audiences; the creator's reporting managers can see shared team events. HR and sales system dates are filtered by role and permissions. The feed recomputes authorized events on each request. Google Calendar controls the refresh timing of subscribed calendars; this is a subscription feed, not two-way Google event editing.

Announcements have their own inbox, unread/hidden views, audience selection, acknowledgement tracking, scheduled publication and expiry. Reporting managers can post to their teams when enabled; broader publication and approval use configurable permissions. Scheduled announcements and notifications remain hidden until publication time. Official announcements can generate signed, stamped letterhead documents after approval.

Notifications have a full paginated inbox with read/unread, hide/restore, delete and links to the relevant item. Mutations are scoped to the signed-in recipient.

Official letters support bilingual templates, company/employee/recipient placeholders, custom subject and body, recipient details, classification, date and signature/stamp options. Letters proceed through draft, approval and issuance. Approved content is immutable; cancellation invalidates its verification status. Template reference placeholders resolve when a letter receives its reference.

## Verification

- Admin production build, type checking, localization parity, action schemas and platform/dashboard permission checks.
- Rollback database tests for every approval type, asset signing links, employee handovers, document signing, calendar audiences, archives, HRMS and support claims.
- Settlement tests for dated rates, first-of-month joiners/leavers, qualification wage caps, partial support, proration, component wages, fractional-year indemnity, missing payroll periods, stale payment rejection, commission ledger updates and payment idempotency.
- Communications tests for manager boundaries, live signatures, scheduled publication, notification ownership, template substitution and issued-letter immutability.
- Arabic and English salary, letterhead, letter and announcement PDF generation. Arabic letter and blank letterhead layouts were inspected visually.

Authenticated browser testing was not completed: automatic approval review rejected reuse of a temporary session token stored by an earlier test. No credential workaround was used. The build and database/PDF checks completed independently.
