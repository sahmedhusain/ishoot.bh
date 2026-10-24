# Feature guide

What the admin system does, by area, and the rules behind it. The exact routes and server actions are listed in [API_REFERENCE.md](API_REFERENCE.md).

## Company setup and branding

- **First-run setup wizard** (`/setup`), six steps. See [GETTING_STARTED.md](GETTING_STARTED.md#c-blank-install-with-the-setup-wizard).
  1. **Company**: content languages (Arabic and English, Arabic only, or English only) and the main language; what the company does (one of eleven activities); names, registration, tagline, founding year, city, country, address and contacts, map and social links.
  2. **Colours & fonts**: eight complete style presets, palettes and free colours with a contrast check; body and heading fonts from 61 Google families (searchable, filtered by script and style), the Thmanyah fonts and other licensed fonts (the company uploads its own copy), or its own WOFF2, WOFF, TTF or OTF files; text size, heading weight, English heading case, corner radius, button shape, tinted or neutral backgrounds and default mode; a live website and admin preview.
  3. **Logos & files**.
  4. **Website**: website or none; website type; catalogue name, address and card style; homepage opening; pages; homepage section order; contact form questions; WhatsApp button; working hours; search engine title and description; publish on finish.
  5. **Configuration**: currency, VAT, document numbers and modules.
  6. **Review**.

  Choosing an activity applies its recommended style, website and modules until the person changes those by hand.
- **Content languages**: with a single language every bilingual form shows one field, and the text is stored on both sides of each English/Arabic pair, so documents, emails and both apps read it whatever their interface language.
- **Settings → Company**: general information, tax and VAT, bank details, document numbering, sales discounts, brand files (text logos, icons, stamp, signature, letterhead) and **Colours & fonts**. Changing the theme re-colours both apps, PDFs and emails immediately.
- **Settings → Modules**: switch optional modules on or off (deals, invoicing, calendar, equipment, website content, reviews).

## Navigation and profile

- The sidebar groups destinations into Workspace, Sales & clients, Production & operations, Finance & accounting, People & payroll, My requests, Communications & documents, Website & marketing, and Administration. Workspace comes first for everyone, and the next group depends on the role (finance, sales, production, marketing, people). Groups collapse individually and remember each person's choices.
- **Notifications:** the dropdown shows the eight most recent messages with all and unread filters and an exact unread count. It refreshes when opened, when the tab becomes visible, and every 30 seconds. The full inbox has read and unread, hide and restore, delete, and links to the record. Notifications store a translation key, so they follow the reader's language.
- **Profile:** personal and work details, reporting manager, edit history, signature, assigned assets and account security. Phone changes save immediately; name, email and stored-signature changes go through approval.

## Approvals and documents

- Configurable approval flows cover quotations, invoices, discounts, payroll, requests, leave, identity changes, signatures, assets, settlements and letters. Super Admin requests are approved automatically; other roles keep permission checks and cannot approve their own requests.
- Generated documents (invoices, quotations, receipts, payslips, certificates, minutes, letters, handovers, settlements) each have separate Arabic and English view, download and print actions.
- Document fields accept a registered upload or an HTTPS link (for example, a VAT certificate on a government portal).
- **Signatures:** signature settings choose a saved or freshly drawn signature per document type. A live signature always needs an explicit decision, including for Super Admin.
- **Official letters:** bilingual templates with company, employee and recipient placeholders go through draft, approval and issue. Issued content cannot be changed, and cancelling invalidates its verification.
- **Company archive:** every file in one place (legal and tax certificates, employee files and permits, leave evidence, receipts, client and deal files, salary documents, handovers, letters, settlements). Access follows permissions, with filters, sorting, expiry tracking, export and printable blank letterhead.

## Sales and finance

- **CRM:** web inquiries are de-duplicated into clients and deals. The deal pipeline has stages, and client profiles cover individuals, local and foreign companies and government, with points of contact and an ABC ranking.
- **Quotations to invoices:** quotations convert to invoices under a row lock, so one quotation never produces two invoices. Discounts above the company or per-user limit need approval.
- **Invoices and payments:** line items, VAT and other taxes, multiple currencies with recorded exchange rates, receipts with their own numbering, and overdue tracking. `pnpm db:check-integrity` audits totals, statuses and numbering.
- **Expenses and claims:** categories, recurring expenses, staff expense claims with approval and payment, and sales commissions.

## HR and payroll

- **Employees first:** create the employee in HR → Employees, then a login in Users. A login requires an active or on-leave employee without one.
- **Social insurance:** dated component rates, eligible categories, wage bases, ceilings and service bands. Employee registrations have effective dates, declared wages and per-component overrides (for example basic salary plus social allowance). GCC nationals need their home-country scheme. A full contribution month is charged when the employee is employed on the 1st, including someone leaving that day; a joiner after the 1st owes nothing that month. Approved payroll keeps its calculation snapshot.
- **Support programmes** (wage support): dated rules, percentage schedules, salary caps by qualification, payment caps, proration and the employee's approval status. Support reduces employer cost, never the employee's salary. Partial approval can be a percentage or a fixed amount.
- **Payroll runs:** attendance, leave, overtime, shift allowances, additions and deductions, commission and recoveries. Runs go through approval, and a salary is paid only once its run is approved.
- **Salary documents:** employees request payslips (up to 24 months at once) and salary certificates from their profile; HR issues them. Delivery is by email (through the retrying outbox) or WhatsApp as a private PDF. Issuing needs `employees:edit` and `payroll:read`.
- **Final settlements:** unpaid approved payroll, missing months, outstanding commission, approved claims, unused leave, employer indemnity (including fractions of a year), recurring items and remaining recoveries. Calculated and manual rows are kept separate. Payment is refused if an included balance changed since calculation. Service before the first payroll record is flagged for HR review.
- **Leave and handovers:** leave types can require a handover. Exit and leave handovers reassign open cases to one person, across a team, or case by case, return company assets, and run an HR checklist with approval.
- **Statutory references** (Bahrain presets, editable per company): [Law 14/2022](https://lloc.gov.bh/Legislation/HTM/K1422) pension schedule; [SIO salary guide](https://www.sio.gov.bh/reports/pdf/SIO_Salary_English) (end-of-service uses basic salary plus social allowance); [Labour Law 36/2012, Art. 116](https://lloc.gov.bh/Legislation/HTM/K3612) indemnity; [Tamkeen plan](https://www.tamkeen.bh/wp-content/uploads/2024/03/EN-2024-Annual-Plan-Final.pdf) (employer unemployment contributions). Another jurisdiction needs its own rules configured.

## Assets

- Custom categories, each with its own fields and checklist. Assets carry serial numbers, condition and status.
- **Issue and return through handovers.** The employee signs (in person or through an expiring, single-use link), then the manager, HR and finance approve. Damage can be recovered from salary. A returned asset goes where the handover says (available by default).
- Checklist answers are explicit yes or no; condition and condition notes are recorded separately.

## Calendar and communications

- Each person has a revocable personal calendar subscription URL. Events can be private, or shared with the team, department, company or selected people; HR and sales dates are filtered by permission.
- **Announcements:** audience selection, acknowledgement tracking, scheduled publication and expiry. Official announcements can produce signed, stamped letterhead PDFs.
- Meetings and minutes with agendas, action items, approval and signature.

## Website

- The public site is driven by the admin: hero banners, the catalogue, services, equipment, client logos, reviews, FAQs and statistics. It serves only the company's content languages; any other language redirects to the main one.
- **Website type** (`packages/database/src/website-presets.ts`): media and production, marketing agency, products and retail, restaurant and café, professional services, real estate, construction and engineering, education and training, health and clinics, events and hospitality, or other. The type sets the wording (`packages/locales/src/website-activities.json`), the catalogue's name, address and card style (video projects, products with prices, listings with details, case studies), the item details the admin asks for (client and year, price and price note, location, labelled details, external link, video, gallery), the homepage opening (full-screen media, text and image, centred headline), the homepage sections, the quote-request questions and the equipment list. Everything stays editable in **Website** in the admin.
- The catalogue lives at `/<language>/<address>` (for example `/en/products`); old `/works` links redirect to it. Items open on their own page with price, details and a quote request about that item.
- With the website module off, the address shows a holding page with the company's name and contacts.
- Changes are drafted, previewed and published. Publishing queues revalidation, so the site updates even if delivery is retried.
- The site uses the company's name, address, logos, theme and fonts. No copy names a specific company.

## Known gaps

- Several user-management actions (edit user, change role, suspend, reactivate, archive, discount limit) exist on the server but have no screen yet. See the [audit](audits/WHITE_LABEL_AUDIT_2026-10.md#7-outcome-19-october-2026).
- Inbound email is not implemented.
