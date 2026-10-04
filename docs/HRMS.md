# Employee payroll and salary documents

Create an employee in HR → Employees first. Creating a login in Users now requires an existing active/on-leave employee without a login. Existing linked employees remain valid.

Employee profiles store employee and employer GOSI settings separately. Each accepts a percentage of gross monthly salary or a fixed BHD amount. Configure both explicitly: payroll no longer infers nationality or rates from CPR length. Existing employment records without settings must be configured before a new payroll run can be generated. Compensation edits create a history record and retain untouched salary fields.

Support programs accept a provider, percentage of gross salary or fixed BHD amount, and inclusive first/last months. Support reduces employer cost, never the employee's salary. Combined support is capped at gross salary plus employer contribution. Payroll retains the contribution settings and support amount used for that run. Active and on-leave employees with a contract covering the requested month are included. Monthly values are not prorated.

HR → Salary slips and certificates lists requests. Employees can request their own documents from My Profile and select up to 24 months in one payslip request. HR issuance requires both `employees:edit` and `payroll:read`; configure those grants for the relevant HR role. Payslips require approved/paid/closed payroll for every requested month. Salary certificates use current compensation. Issuance saves a snapshot, and subsequent compensation edits do not rewrite issued documents.

PDFs use the invoice document font, company logo, signature and stamp. Employees can read/export their own issued documents. HR managers can issue and review documents. Email uses the existing durable email outbox and sends the attachment to the employee's recorded email; run the email worker with the existing provider configuration. A failed outbox job is reported as failed, not sent.

WhatsApp sends private PDF bytes through the configured Meta integration (`phoneId`, `token`) to the employee's recorded international phone number. It uploads media and sends by media ID; it does not publish salary document URLs. Provider acceptance is audited separately from delivery. Meta's conversation-window/template rules still apply. If WhatsApp is not configured, use the device share sheet or download and attach the PDF. No email or WhatsApp messages are sent by the test scripts.

Super Admin requests are approved automatically, including financial approval submissions and identity/leave requests. Other roles retain explicit permission checks and self-approval restrictions. Super Admin operational work remains available during leave. Suspending, archiving or deleting the last active Super Admin remains blocked. Account status edits revoke sessions where applicable and record audit events. The audit page shows actual event counts and expandable before/after changes.

Currency storage uses ISO currency codes, including OMR and KWD. Display uses Unicode symbols in both languages, with BHD/KD/QR and RO as applicable abbreviations. The shared currency registry covers currency choices and ISO minor units. New currency signs fall back to readable Latin abbreviations when browser fonts lack glyphs; the bundled PDF font currently requires SAR/AED/RO/KGS/MVR fallbacks. Unicode mappings are based on the [Unicode currency chart](https://www.unicode.org/Public//UCD/latest/charts/nameslist/20a0/).

## Verification and rollout

- `npm run test:hrms`: calculation, request ownership, locale parity, mocked WhatsApp upload/send, and Arabic/English PDF checks.
- `npm run test:hrms-db`: local-only database integration test; fixture writes are rolled back.
- Apply Prisma migrations in deployment. The dashboard migration records the previously staged HRMS tables, and the salary-document migration adds contribution/support snapshots and salary document requests. The development database already contained the dashboard tables; its schema was compared before marking that baseline migration applied.
- HR/profile/approval/navigation labels were moved into the locale JSON files. This change does not claim an exhaustive localization cleanup of unrelated legacy screens.
