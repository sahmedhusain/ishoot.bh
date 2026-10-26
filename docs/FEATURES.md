# Feature guide

What the admin system does, by area, and the rules behind it. The exact routes and server actions are listed in [API_REFERENCE.md](API_REFERENCE.md).

## Company setup and branding

- **First-run setup wizard** (`/setup`), six steps. See [GETTING_STARTED.md](GETTING_STARTED.md#c-blank-install-with-the-setup-wizard).
  1. **Company**: content languages (Arabic and English, Arabic only, or English only) and the main language; what the company does (one of 23 activities, each card with a drawing of its sample homepage and **Show an example**); names, registration, tagline, founding year, city, country, address and contacts, map and social links.
  2. **Colours & fonts**: 22 complete style presets (several with a light website), palettes and free colours with a contrast check; body and heading fonts from 61 Google families (searchable, filtered by script and style), the Thmanyah fonts and other licensed fonts (the company uploads its own copy), or its own WOFF2, WOFF, TTF or OTF files; text size, heading weight, English heading case, corner radius, button shape, tinted or neutral backgrounds and default mode; a live website and admin preview.
  3. **Logos & files**.
  4. **Website**: website or none; website type; **Start with sample content**; catalogue name, address and card style; homepage opening; pages; homepage section order; contact form questions; WhatsApp button; working hours; search engine title and description; publish on finish.
  5. **Configuration**: currency, VAT, document numbers, modules, and the departments (with the roles that come with them).
  6. **Review**.

  Choosing an activity applies its recommended style, website, modules, sales pipeline stages and departments until the person changes those by hand. Beside the Website and Colours steps a **live preview** shows the real website at desktop or phone width while it is edited (nothing is saved until the step is). Steps slide in the reading direction; with "reduce motion" they only fade.
- **Content languages**: with a single language every bilingual form shows one field, and the text is stored on both sides of each English/Arabic pair, so documents, emails and both apps read it whatever their interface language.
- **Settings → Company**: general information, tax and VAT, bank details, document numbering, sales discounts, brand files (text logos, icons, stamp, signature, letterhead) and **Colours & fonts**. Changing the theme re-colours both apps, PDFs and emails immediately.
- **Settings → Modules**: switch optional modules on or off: deals, invoicing, calendar, equipment, website content, reviews, tasks and projects (on by default), and, off until a company needs them, products, purchasing, online store, delivery, marketing, public relations and legal. A module that is off hides its pages, its reports and its permissions.
- **Settings → Sales pipeline**: the company's deal stages (names per language, order, colour, win %, custom stages). System stages (lead, proposal sent, contract signed, invoiced, won, lost) can be renamed and reordered but not removed.
- **Domains** (Settings → Website and the wizard): the website and admin domains, the DNS records to add, and **Check domain** (see [OPERATIONS.md](OPERATIONS.md#domains)).

## Navigation and profile

- **Dashboard**: a board of widgets (figures, charts, lists, the approvals and requests inbox, my tasks, quick actions and recent activity) from every module. Each role starts from its own layout (finance, HR, sales, operations, warehouse, delivery, customer service, marketing, legal…); **Customize** lets each person drag widgets into order (or use the arrow buttons), change their width, remove them, add others, and return to the default. A widget appears only when its module is on and the person may read its data, and lists follow the data scope (deals) and task and delivery visibility. Recent activity shows everyone's changes to people who may read the audit log, otherwise their own.
- **Department dashboard** (`/dashboard/department`, "My department" on the dashboard): for department heads and deputies (and people who manage every employee): the team with who is away today, open and overdue tasks and open requests per person, and leave waiting for a decision, including the departments underneath.
- **Search (Cmd+K or Ctrl+K)** finds clients, deals, invoices, people, orders, products, shipments, tasks, purchase orders, legal matters and campaigns, each only when its module is on and the person may read it.
- The sidebar groups destinations into Workspace, Sales & clients, Production & operations, Finance & accounting, People & payroll, My requests, Communications & documents, Website & marketing, and Administration. Workspace comes first for everyone, and the next group depends on the role (finance, sales, production, marketing, people). Groups collapse individually and remember each person's choices.
- **Notifications:** the dropdown shows the eight most recent messages with all and unread filters and an exact unread count. It refreshes when opened, when the tab becomes visible, and every 30 seconds. The full inbox has read and unread, hide and restore, delete, and links to the record. Notifications store a translation key, so they follow the reader's language.
- **Profile:** personal and work details, reporting manager, edit history, signature, assigned assets and account security. Phone changes save immediately; name, email and stored-signature changes go through approval.

## Departments, roles and people

- **Departments**: a tree with parent, head, deputy, cost centre and order (Settings → Departments). Accounts belong to their employee record's department. The "department manager" approval step uses it, includes the deputy, skips the requester and climbs to the parent department when there is no head.
- **Role templates**: 22 templates (owner, administrator, department manager, finance and HR managers, accountant, sales manager and rep, marketing, PR officer, legal counsel, procurement officer, warehouse keeper, delivery coordinator, driver, customer service, operations manager, project lead, content editor, employee, viewer…). A missing grant means denied.
- **Data scope** per role and area (deals, requests, expenses, claims, leave): own, department (with sub-departments) or all. Records without an owner are visible only to "all".
- **People at scale**: users searched, filtered and paged on the server with bulk role and department changes; a searchable directory and an **org chart**; **CSV import** of employees and accounts (up to 2,000 rows, with a preview of every row's problems).

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

## Products, stock and purchasing

- **Products** (module `products`): nested categories, SKU and barcode (unique across products and variants), cost, price, VAT exemption, pictures, up to three options with generated **variants**. "Show on the website" links the product to a catalogue item and keeps one price.
- **Inventory**: warehouses and locations; a **stock ledger** is the only way stock changes (receipt, sale, return, transfer, adjustment, write-off, count), so stock can never go below zero or take reserved units. Weighted average cost, stock value, **reorder points** with one alert per dip, **batches and expiry**, and **stock counts** (full or cycle, typed or scanned, approved into one movement per difference).
- **Purchasing** (module `procurement`): suppliers with delivery and payment days; **requisitions** through the approval engine; **requests for quotation** with prices side by side and the cheapest pre-selected; **purchase orders** approved, then e-mailed as a letterhead PDF or sent by WhatsApp; **goods receipts** (accepted and rejected, batch and expiry) into stock; **supplier bills** with a **three-way match** (order, receipt, bill; 1% price tolerance), the supplier's invoice file, approval into an expense with input VAT, and payments; supplier performance and purchase price history.

## Online store, payments and delivery

- **Customer accounts** on the website (module `store`): e-mail and password, a six-digit e-mailed code, or Google and Apple sign-in (Settings → Integrations); profile, addresses, orders, wishlist, "Get help with this order" and "Delete my account".
- **Cart and checkout**: options, stock left, coupons, delivery or pickup, guest checkout (optional). Prices, stock, coupons and delivery are always worked out again on the server; placing an order holds the stock and e-mails the confirmation in the customer's language.
- **Orders** (Admin → Online store): placed → packing → shipped → delivered, returns and cancellations moving the stock; payments (cash, card, bank transfer with the transfer receipt), refunds, invoices; **New sale** for counter, phone and WhatsApp orders; store settings and coupons.
- **Online payments**: Stripe, Tap, PayPal, Checkout.com, PayTabs, Moyasar and HyperPay, each a payment-gateway integration with a health check. Checkout or a **payment link** opens the gateway; the return and the verified webhook record the money exactly once; refunds go back through the gateway; abandoned payments expire and their orders are cancelled.
- **Delivery** (module `delivery`): zones (areas or cities, fee, minimum order, free-delivery threshold), weekly **time slots** with capacity, a delivery promise, and a **shipment** for every delivery order, with a tracking page for the customer (`/<language>/track/<token>`). Failed attempts record one of seven reasons.
- **Own fleet**: vehicles, **route sheets** with ordered stops, the driver's phone view (`/dashboard/driver`: navigate, call, photo or signature as proof, cash collected, "could not deliver"), and **cash from drivers** settled against the orders.
- **Courier agencies**: Aramex, DHL Express and SMSA (booking, label and tracking through their APIs) or any agency by hand; agency invoices recorded as delivery expenses, and **cash remitted by agencies** paying the orders.

## Tasks and departments' own tools

- **Tasks and projects** (Work → Tasks): My tasks by due date, all tasks, a drag-and-drop board, projects with progress, comments, links to an order, deal, request, shipment, purchase order or contact, and reminders the day before a task is due. People who may not assign can only give tasks to themselves.
- **Customer service** on the request desk: resolution times by priority, saved replies in each language, replies to the customer by e-mail or WhatsApp, and requests linked to orders.
- **Marketing** (module `marketing`): campaigns with budget, spend and UTM tracking (orders, revenue, requests and return on spend), a tracked-link builder, customer segments, and opt-in e-mail broadcasts with a signed unsubscribe link.
- **Public relations** (module `pr`): press releases (articles in the press-release category), media contacts, a coverage log with a 90-day summary, and a press page on the website.
- **Legal** (module `legal`): matters with type, status, other party, court reference, next hearing or deadline (counsel is reminded a week before), notes and outcome; a register of licences and registrations from the archive, and of contracts.

## Reports

- Workspace → Reports lists the reports each role may run (17 in all): sales by product (with cost and margin), category, channel, customer and salesperson, the order funnel; stock on hand and value, fast and slow movers, count differences; spend by supplier, open purchase orders, price changes; delivery performance; receivables and payables aging; marketing return; headcount by department.
- Each report has a date range with presets, a comparison with the period before, a bar chart and totals, and exports as **CSV**, **Excel** and **PDF** (company letterhead). Reports can be **e-mailed on a schedule** (daily, weekly or monthly) to up to 20 addresses, with what the owner may see at that moment.

## Website hero banners, the catalogue, services, equipment, client logos, reviews, FAQs and statistics. It serves only the company's content languages; any other language redirects to the main one.
- **Website type** (`packages/database/src/website-presets.ts`): media and production, marketing agency, products and retail, restaurant and café, professional services, real estate, construction and engineering, education and training, health and clinics, events and hospitality, or other. The type sets the wording (`packages/locales/src/website-activities.json`), the catalogue's name, address and card style (video projects, products with prices, listings with details, case studies), the item details the admin asks for (client and year, price and price note, location, labelled details, external link, video, gallery), the homepage opening (full-screen media, text and image, centred headline), the homepage sections, the quote-request questions and the equipment list. Everything stays editable in **Website** in the admin.
- The catalogue lives at `/<language>/<address>` (for example `/en/products`); old `/works` links redirect to it. Items open on their own page with price, details and a quote request about that item.
- With the website module off, the address shows a holding page with the company's name and contacts.
- Changes are drafted, previewed and published. Publishing queues revalidation, so the site updates even if delivery is retried.
- **Pages** (Website → Pages): the homepage, About, Contact and any new page are built from ordered **blocks** (hero, about, text, image and text, gallery, video, catalogue, services, figures, testimonials, FAQ, client logos, call to action, contact form, map, team, latest articles, columns, custom code, embed and more), with SEO fields and a signed draft preview.
- **Menus** for the header and footer; **articles** (news, updates, posts, press releases) with a rich editor, scheduling, approval, share links and RSS; analytics by id (Google Analytics, Meta Pixel, TikTok Pixel) and sandboxed custom code.
- **Sample content** for every activity (banners, catalogue items, services, figures, questions and a welcome article, pictures drawn in the company's colours), removable in one click, and an **example website** per activity.
- The site uses the company's name, address, logos, theme and fonts. No copy names a specific company.

## Known gaps

- Editing one user, suspending, reactivating, archiving and the per-user discount limit exist as server actions but have no screen yet (roles and departments can be changed in bulk from Users). See the [audit](audits/WHITE_LABEL_AUDIT_2026-10.md#7-outcome-19-october-2026).
- Inbound email is not implemented.
- WhatsApp order confirmations and WhatsApp marketing broadcasts need message templates approved by Meta; orders confirm by e-mail and broadcasts are e-mail only.
- Tap, PayPal, Checkout.com, PayTabs, Moyasar and HyperPay, and the Aramex, DHL Express and SMSA APIs, are built to their published APIs and unit-tested, but have not been run against their sandboxes (they need merchant test accounts). Stripe is tested end to end against a local stand-in.
- Motion polish across both apps (plan Phase 11) is in progress; see [plans/PLATFORM_V2_PLAN.md](plans/PLATFORM_V2_PLAN.md).
