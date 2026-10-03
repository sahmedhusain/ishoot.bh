# iShoot website, CMS and contact enhancement plan

Date: 3 October 2026
Status: core implementation completed locally. See [delivery report](website-enhancement-delivery-2026-10-03.md) for verified behavior, rollout steps and outstanding scope. This document retains the original broader roadmap.

## Direction and scope

Use the requested **mixed dark and light sections**. Retain iShoot’s cinematic identity, existing bilingual experience and production imagery. Dark backgrounds frame films and selected projects; warm light backgrounds support reading, services and forms. Use consistent typography, spacing and components across both themes. Preserve Arabic RTL as a first-class layout.

Reuse Next.js, Tailwind, Framer Motion, Lenis, Prisma and existing dashboard components. Do not introduce a second CMS, animation framework or unrestricted page builder. The dashboard should manage bounded content and publishing; application code should retain validation, permissions and routing rules.

This plan builds on `platform-audit-2026-10-03.md` and `implementation-2026-10-03.md`. Findings below are based on source inspection. Live browser navigation timed out, and live database verification remains outstanding; visual quality and production performance have not been measured.

## Confirmed gaps to resolve

| Area                   | Source observation                                                                                          | Required change                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Homepage services      | ServicesSection uses locale catalogue rather than database service records                                  | Connect published marketing service content to stable service IDs                |
| Portfolio              | WorksSection hardcodes categories and selects the first four items                                          | Use database categories and deliberate featured ordering                         |
| Hero                   | CinemaHero ignores stored CTA destination, omits available video poster, and vanishes with no active banner | Validate and use CTA links, show poster, provide useful empty-content fallback   |
| Motion                 | Most animations lack reduced-motion handling; carousel and marquee run automatically                        | Add a shared motion policy and visible pause controls                            |
| Smooth scroll          | Lenis RAF cleanup tracks only the initial frame                                                             | Cancel the current frame and disable enhancement when reduced motion applies     |
| Project cards/lightbox | Clickable containers and custom dialog lack complete keyboard/focus behavior                                | Semantic triggers, labelled dialog, focus trap/restore and scroll containment    |
| Contact form           | Service and budget are selected by default; translated labels act as identifiers                            | Require intentional choices, persist stable IDs, offer “not sure”                |
| Contact submissions    | One project brief cannot represent support and feedback workflows                                           | Explicit request types with relevant fields and dashboard routing                |
| Email delivery         | Inquiry mapper reports confirmation/notification sent as true without persisted evidence                    | Record delivery state; display actual status and allow controlled retries        |
| Inquiry mapping        | Resolver metadata is not fully surfaced in mapped records                                                   | Preserve customer relation, source and merge flags for authorized staff          |
| Public reviews         | Public query includes related client object                                                                 | Return an explicit public field projection; keep private client data server-side |
| Review languages       | Public submission copies the original text into both language fields                                        | Record original language and treat translation as an editorial action            |
| CMS                    | Existing collection editors publish immediately; no complete preview/revision workflow                      | Introduce staged publishing for selected content and expand consistently         |
| Media                  | Existing upload policy primarily supports private documents and small images                                | Separate public website media policy from private customer files                 |

Primary source areas: `apps/web/components`, `apps/web/app/[locale]`, `apps/web/app/api/inquiry`, `apps/web/app/api/reviews`, `packages/database/src/queries/inquiries.ts`, `packages/database/src/queries/reviews.ts`, Prisma schema, and dashboard WebSettingsView/CMS actions.

## Website composition

### Homepage

1. **Dark cinematic hero:** one clear headline, concise supporting copy, “View our work” and “Request a quote.” Use a poster-first film presentation, readable contrast and a pause control. Avoid competing decorative text.
2. **Light introduction and client proof:** concise positioning, real client logos, a clear route to company information. Use a static logo grid on mobile or when motion is reduced.
3. **Light services:** clear service groups, useful descriptions, relevant imagery and a service-specific quote link. Choose a legible editorial layout instead of repeating identical cards everywhere.
4. **Dark selected work:** larger project imagery, database categories and featured ordering. Clearly distinguish playable films from image galleries; do not claim 4K unless supported by metadata.
5. **Light process and practical details:** explain brief, planning, production and delivery using real business practices. Publish only verified statistics.
6. **Light testimonials and FAQ:** approved reviews, clear attribution, accessible disclosure controls, links to relevant services.
7. **Dark closing CTA and footer:** contact routes, studio information, social links and a concise next step.

Control section visibility and order within this fixed set. Hide empty optional sections cleanly. Do not allow arbitrary nested layouts in the CMS.

### Services, work and company pages

- Services: light reading surface, dark media blocks, deliverables and scope, relevant projects, FAQs and a quote CTA carrying the stable service ID.
- Work listing: accessible filters using database categories, useful empty states and paginated/loading behavior appropriate to collection size.
- Project detail: prominent media, scope and credits where available, related projects and a relevant inquiry CTA. Preserve image/video aspect ratios to prevent layout shifts.
- About/studio: real people, equipment and process; mix readable light sections with authentic dark media sections. Reuse existing company/equipment records.
- Shared navigation: clear active state, accessible mobile menu, visible language switch and persistent but unobtrusive contact access. Check RTL icons, menus, form alignment and translated text expansion.

### Design system deliverables

Define paired surface/text/border tokens, one spacing scale, heading/body hierarchy, consistent buttons, field states and focus rings. Keep light sections warm and dark sections neutral; select final colors against actual media and contrast checks. Use responsive typography and bounded text widths. Dashboard screens prioritize clarity, density and predictable controls over cinematic effects.

## Motion specification

| Interaction       | Proposed behavior                                    | Reduced-motion behavior                 |
| ----------------- | ---------------------------------------------------- | --------------------------------------- |
| Section entry     | Opacity and small vertical offset, once, 250–400 ms  | Content immediately visible             |
| Hero transition   | Gentle opacity transition, 400–600 ms; no large zoom | Immediate change; no automatic rotation |
| Buttons/fields    | Color or small transform, 120–180 ms                 | Color/focus feedback without movement   |
| Portfolio filters | Short opacity transition, about 180–250 ms           | Immediate update                        |
| Dialog            | Opacity and subtle scale, 180–220 ms                 | Immediate open/close                    |
| FAQ               | Short expansion without overshoot                    | Immediate expansion                     |
| Logo strip        | Optional slow movement with pause control            | Static grid                             |
| Dashboard         | Short state feedback only                            | Immediate state changes                 |

Use CSS for simple hover/focus effects and installed Framer Motion for coordinated transitions. Avoid scroll hijacking, continuous decorative motion and expensive layout animations. Fix Lenis cleanup; disable it under reduced motion and preserve native keyboard, anchor and browser navigation behavior. Pause autoplay when offscreen or the tab is hidden where practical; never force audio autoplay.

Automatically moving content requires appropriate pause/stop controls: [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide/).

## Contact Us: one entry point, distinct workflows

Use a light form area beneath a concise dark introduction. Display studio contact information, verified hours, address/map link, email, telephone and WhatsApp with useful labels. CMS-managed response expectations must reflect actual staffing; avoid unsupported promises.

| Intent          | Required information                                 | Optional/contextual information                                                 | Dashboard handling                                              |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| General inquiry | Name, email or phone, message                        | Company, service, preferred reply method                                        | Sales inbox; qualify or resolve                                 |
| Quote request   | Name, reply contact, service(s), project brief       | Budget or “not sure,” desired date/flexibility, location, deliverables, company | Sales owner; review brief, request details, prepare quote       |
| Complaint       | Reply contact, issue description                     | Project/reference, incident date                                                | Restricted support queue; assign, investigate, respond, resolve |
| Suggestion      | Suggestion text                                      | Name/contact only if a reply is requested                                       | Feedback queue; review and resolve                              |
| Rating/review   | Author display name, integer rating 1–5, review text | Private contact and project reference for verification                          | Existing review moderation; publish only after approval         |

Do not automatically create sales leads from complaints, suggestions or reviews. Reuse the current contact resolver for sales inquiries and quote requests. Complaint matching must not reveal whether a person exists in the database.

Form behavior:

- Choose intent first; show only relevant fields. Preserve entered text when switching intent where fields remain applicable.
- Use stable IDs for services and budgets, with localized display labels. Preselect a service only when the visitor intentionally follows its CTA; do not invent a budget.
- Use labelled controls, inline field errors and an accessible submission status. Keep input on failure, prevent duplicate clicks and support retry safely.
- Return a friendly submission reference and realistic next steps. Display email-delivery failure separately from successful persistence: a saved request must not appear lost because email failed.
- Add server-side validation, request-size limits, rate limiting and a honeypot using existing patterns. Add CAPTCHA only if measured abuse warrants it.
- Start with text-only submissions. Public attachments need a separate private storage policy, strict file/size limits and authorized download access before enabling them.
- Reviews remain in the Review model and approval workflow. Public display must never include private contact data. Preserve the submitted language; do not fabricate translated reviews.

A quote request is a request for assessment, not an issued financial quote. Do not automatically calculate binding prices or create invoices. Reuse an existing quotation implementation if discovered during implementation; otherwise define an issued-quote workflow separately when the business needs it.

## Dashboard and CMS ownership

| Content/workflow                | Existing foundation             | Required dashboard controls                                                                     |
| ------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Hero                            | HeroBanner                      | Localized text/CTAs, validated destination, image/video/poster, order, preview/publish          |
| Services                        | Service                         | Separate marketing content from billing defaults; localized copy/image, public visibility/order |
| Portfolio                       | PortfolioCategory/PortfolioItem | Categories, featured selection, media metadata, accessible descriptions, preview/publish        |
| Company/contact/footer          | CompanySetting and social links | Public contact fields, hours, response copy and links; protect financial settings               |
| Homepage sections/page copy     | Existing components             | Bounded section order/visibility, localized headings and CTA copy                               |
| FAQs/statistics/logos/equipment | Existing models/editors         | Clear published state, ordering, empty states and validated records                             |
| Reviews                         | Review moderation               | Original language, approval/rejection, public attribution, private verification fields          |
| Requests                        | Inquiry and CRM                 | Intent/status filters, owner, priority, private notes, reply history and delivery state         |

Give editors only their content permissions. Sales staff can manage inquiry/quote queues; complaints require explicit support access. Validate authorization on server actions and API routes, not just navigation. Record meaningful publish, approval, assignment and status changes in the existing audit trail.

CMS publishing should show draft versus published state, preview, field validation and a clear result. Start with hero, page copy and portfolio as the preview pilot, then extend the same workflow to remaining editorial collections. Use [Next.js Draft Mode](https://nextjs.org/docs/app/api-reference/functions/draft-mode) with an authorized, expiring preview session and no public draft leakage. Published data must remain stable while an editor changes a draft. Store the previous published snapshot for recovery; avoid building branching/version-merging infrastructure.

## Database and backend implementation

### Reuse first

Keep Inquiry as the canonical request record and Review as the canonical review record. Extend existing models where possible. Keep billing Service fields intact while adding marketing fields. Use existing User ownership and audit patterns.

### Minimum schema changes

- Inquiry: intent, unique submission reference, unique idempotency key, optional assigned user, priority, resolution timestamp, and structured quote details validated at the server boundary. Retain existing sales statuses and historical values; define allowed transitions by intent, adding support statuses deliberately.
- Service selection: store stable service relations with a submitted display snapshot where needed. Do not continue using comma-joined translated labels as the only record of intent.
- Request activity: add a small related record for private notes and reply history if no existing reusable activity store supports them. Preserve author/time and distinguish internal notes from customer messages.
- Delivery: persist pending/sent/failed and provider reference/attempt information for acknowledgment and staff notification. Use the existing sending path first; add a worker/outbox only if available infrastructure or reliability requirements justify it. Do not mark delivery sent before the provider confirms acceptance.
- Review: original language and separate private verification information; explicit public query projection.
- Public page content: one bounded page-content record with validated localized content and separate draft/published snapshots. No unrestricted executable HTML. Existing collection drafts need separate staged values or publish snapshots so editing cannot mutate the live record before publish.
- Marketing services/contact settings: public image/description/visibility and verified hours/response copy. Separate public projections from finance and customer information.

Add indexes for actual dashboard queries: intent/status/date, owner/status/date and unique reference/idempotency. Confirm the generated query plans before adding further indexes. Paginate growing request/review/portfolio lists; select only needed fields.

### Safe migration sequence

1. Inspect the complete current schema, callers and migration history; use a disposable PostgreSQL database first.
2. Add nullable/defaulted fields without deleting old columns or status values.
3. Backfill existing inquiries as general inquiries; preserve historical CRM conversion and identity metadata. Populate stable service relations only when mapping is unambiguous.
4. Initialize published CMS snapshots from current live content so deployment does not blank the site.
5. Deploy compatible readers/writers, verify counts and sample records, then enforce validated constraints where appropriate.
6. Apply reviewed Prisma migrations in deployment. Do not use production `db push` or destructive resets. Preserve a backup/recovery path before touching production data.

## Performance, safety and verification

Use optimized images with dimensions and useful alt text; provide film posters, avoid eager-loading every video and lazy-load secondary media. Keep data fetching server-side and send small public projections. Replace blanket dynamic rendering only after identifying genuinely personalized routes and reliable content invalidation; do not cache private dashboard data publicly.

Proposed public performance targets are LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 at the 75th percentile, aligned with [Web Vitals](https://web.dev/articles/vitals). These are targets, not current measured results.

Required checks:

- All five contact intents: validation, persistence, routing, confirmation and delivery failure; duplicate retry creates one record.
- Review submission stays unpublished; public payload contains no client email, phone or private notes.
- Sales requests preserve resolver/CRM relationships; support and feedback do not create unintended leads.
- Role-based access denies unauthorized complaint access, private notes, publishing and file retrieval.
- Draft edits do not change published pages; preview requires authorization; publish/recovery works in both languages.
- Database migration preserves existing records and constraints; inspect representative query plans.
- Keyboard navigation, visible focus, dialog focus restore, screen-reader field errors, reduced motion and pause controls.
- Mobile/desktop English and Arabic: content expansion, RTL, light/dark contrast, loading/error/empty states and slow network.
- Run existing platform checks, type checks and production builds, plus focused database integration checks for the changed workflows. Validate visual pages in a real browser before declaring the redesign complete.

## Ordered delivery plan

| Phase                          | Work                                                                                                           | Completion evidence                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1. Foundations and correctness | Public review projection, delivery mapping, stable IDs, hero CTA/poster fallback, motion cleanup/accessibility | Focused regression checks; unchanged existing submission/CRM behavior  |
| 2. Contact and dashboard       | Typed intents, conditional form, minimum schema migration, queues/assignment/status/notes, moderation          | End-to-end requests verified against PostgreSQL and role checks        |
| 3. CMS publishing              | Public page/settings content, staged hero/portfolio, preview/publish/recovery, media policy                    | Draft isolation, publish and bilingual public rendering verified       |
| 4. Visual redesign             | Tokens, navigation, mixed homepage sections, services/work/about/contact layouts                               | Responsive English/Arabic browser review with real content             |
| 5. Motion and performance      | Restrained transitions, autoplay controls, optimized media, targeted rendering/cache changes                   | Reduced-motion verification, browser measurements and production build |
| 6. Release readiness           | Backfill rehearsal, storage/email configuration, migration deployment and smoke checks                         | Documented migration outcome and complete request-to-dashboard flow    |

Some visual work can start after phase 1, but the contact and CMS screens must follow stable backend contracts. Each phase should leave a usable app; avoid replacing every page in one unreviewable change.

## Skills selected

- **redesign-existing-projects:** preserve the existing product and improve hierarchy/layout from actual source.
- **design-dna:** define consistent mixed-theme typography, surfaces and spacing.
- **motion-design:** set intentional motion and reduced-motion behavior.
- During implementation, use **frontend-ui-engineering** for accessible components and **review-animations** for the final motion pass.
- Use database performance guidance once actual database queries and plans can be examined; apply the Supabase skill only if the project actually uses Supabase.

No additional libraries, design generators or CMS platform are needed for this scope. Advanced animation, public file uploads and a full quotation/accounting expansion should follow a demonstrated requirement.
