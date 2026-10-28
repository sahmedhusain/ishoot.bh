# CMS-managed website and commerce redesign

Status: implementation brief requested on 2026-10-27. This document records scope and acceptance criteria; it does not claim that the features below are implemented.

## Objective

Apply the Material 3 design principles established in the admin to the public website, with public-facing typography, layouts and branding appropriate to each business. Redesign the whole website, including contact, news, works, collections, the shop, checkout and customer accounts. Make presentation and relevant features manageable through the existing admin CMS. Preserve existing working business rules while adding the requested capabilities.

The user explicitly requested a separate chat to implement this work. Begin implementation after a short repository audit; do not stop after producing another plan.

## Confirmed requirements

- Remove public WhatsApp buttons: floating chat, contact CTA and public share buttons. Retire the website toggle so old published settings cannot restore them. Preserve historical company contact data and back-office order channels.
- Provide light, dark and mixed designs. Treat mixed as independently themed page sections, headers and footers. The CMS controls allowed modes, default mode, following the OS, whether visitors can switch, and whether a page/region inherits or overrides its theme. Ignore stale visitor choices when switching is disabled.
- Make content, pages, navigation, sections, variants, branding and storefront presentation configurable through admin. A setting is complete only when it persists, previews, publishes and changes the public page.
- Provide Material 3 interaction states, purposeful motion and reduced/off motion behavior. Carry over accessible custom selects, popup positioning, structured dialogs and overlay scrolling without creating duplicate scroll systems.
- Support Arabic and English, mixed-language content, RTL/LTR, phones and tablets. Nothing should escape the viewport or become unreachable.
- Develop the store deeply: banners, offers, categories, filters, products, carts, customer accounts, payments, delivery, addresses, attachments, location integrations and pickup from an eligible branch.
- Cover every existing business category through editable page presets and optional capabilities. Restaurant menus and construction services/projects are explicit priorities.

## Repository baseline: reuse these systems

The starting commit for the completed admin redesign is `874da4b`. Inspect the current checkout before changing it; another chat may have made subsequent changes.

| Area | Existing implementation |
| --- | --- |
| Public routes and shell | `apps/web/app/[locale]/`, especially `layout.tsx`, dynamic collection routes, contact, account, cart, checkout, payment and tracking |
| CMS rendering | `apps/web/components/blocks/`, `apps/web/lib/website.ts`, `apps/web/lib/site.ts`, `apps/web/lib/menus.ts` |
| CMS configuration and validation | `packages/database/src/website-config.ts`, `website-presets.ts`, `cms/blocks.ts` |
| Draft, preview, publish, restore | `apps/admin/components/cms/WebsiteEditor.tsx`, website actions and published website snapshots |
| Existing admin controls | `WebSettingsView`, `WebsiteSetupFields`, `ThemeEditor`, page/article/menu/banner editors, `StoreSettingsView`, delivery settings and integrations |
| Theme foundation | `packages/database/src/constants/theme.ts`, shared Material roles, light/dark palettes, company fonts/shapes and style presets |
| Shared controls | `packages/ui/src/`: buttons, fields, custom selects, dialogs, floating surfaces, overlay scrollbars and motion preferences |
| Customer accounts | `Customer`, `CustomerSession`, `CustomerAddress`, authentication codes and wishlist models; `apps/web/components/account/`; account APIs |
| Existing commerce | Products/variants, categories, stock, coupons, cart, authoritative quotes, sales orders, payment attempts/webhooks, customer order history |
| Delivery | Zones, fees, delivery windows/capacity, shipments and tracking; checkout currently supports delivery or generic pickup |
| Tests | `tests/e2e/specs/web/{site,links,store,account,payments,delivery}.spec.ts`; existing admin CMS and business tests; Playwright, Axe and Vitest |

Customer multi-address storage already exists. Extend it rather than introducing another account/address system. Generic pickup exists, but the inspected schema has no dedicated public branch model. Verify the complete model before designing branch pickup. Public case studies should extend the CMS portfolio/catalogue; do not expose internal task-management `Project` records as public projects.

The public shell currently sets `company.theme.websiteMode` on the document, and several components assume fixed dark/light colors. `brand-images.ts`, `PreviewBridge`, hardcoded section tones and portaled popups all need explicit review for mixed themes. Existing Lenis/floating-scrollbar behavior also needs review before selecting a single scrolling implementation.

## CMS and design contract

Use validated, versioned settings with backward-compatible defaults for existing drafts, snapshots, presets and published sites. Reuse the current source of truth rather than maintaining competing design settings in several editors.

Provide clear admin groups for:

- Brand and themes: palette seeds, typography, type scale, shapes, borders/elevation, spacing/density, media treatment and accessible foreground/background pairs.
- Layout: header and footer variants, navigation, content width, page templates, section visibility/order, responsive columns, hero variants and reusable sections.
- Page and region styling: inherit/light/dark/brand treatment, component variants, image overlays and appropriate logo variants. Popups must inherit their anchor's theme even when portaled.
- Motion: coherent intensity/reduced/off controls, respecting OS preferences and every JavaScript-driven animation.
- Content: localized titles, body copy, media, labels, CTAs, contact details, hours, forms, SEO/social metadata and collection fields.
- Store presentation: storefront, category, product and cart layouts; search/filter controls; offer placement; checkout composition; customer-area presentation.
- Capabilities: enable/disable the shop, ordering, accounts, wishlist, delivery, branch pickup, bookings/inquiries, public downloads and category-specific sections. Disabled capabilities must disappear from navigation and reject unsupported actions server-side.

Use sensible curated presets plus detailed controls. Avoid an unmanageable list of arbitrary CSS fields. Preserve safe custom-code sandboxing and never publish integration secrets, private customer data or draft-only settings.

Theme precedence must be documented and tested: CMS restrictions first, then an allowed visitor choice or system preference, then page/section overrides. Prevent flashes of the wrong theme. Support media foregrounds and logos in both tones. A mixed site must not depend on hardcoded white text or one global `.dark` class alone.

Preserve revision checks, unsaved-change guards, permissions, preview protection, publishing, restore behavior, cache invalidation and language visibility. Changing a preset must not overwrite authored content without a concrete preview and an intentional user action.

## Page and component redesign

Create a route inventory before editing and track each route and important state through implementation and verification.

- Home: configurable hero, announcement/promotion banners, industry sections, featured content, offers and clear actions.
- Contact: a complete responsive redesign with CMS-managed introduction, contact channels, hours, branches, directions/maps and an accessible inquiry form. Support service/product/project intent, attachment settings and clear success/error states. Remove WhatsApp CTAs.
- News/articles: configurable index, topic filters/search/pagination, article reading layout, media, related content, sharing without WhatsApp and localized metadata.
- Works/projects: configurable collection and detail layouts, galleries, facts, sectors/categories, related work and inquiry actions.
- About, services and custom CMS pages: coherent reusable blocks and page templates, including empty, loading, error and unpublished states.
- Navigation/footer/search, consent where applicable, modals, drawers, menus, forms and notifications: consistent Material interaction and theme behavior.
- Customer and transactional pages: sign-in, registration, verification/recovery, profile, address book, wishlist, orders, payment, confirmation and tracking.

The public site should use the same design principles as admin, with layouts suited to a branded website and shopping journeys.

## Commerce capabilities

### Discovery and products

Manage homepage/category banners, scheduled offers, featured products, category trees, search, configurable facets, sort order, pagination and mobile filters from admin. Provide useful category landing pages and product detail pages with media, variants/options, price/availability, specifications, public attachments, related products, delivery/pickup information and clear actions. Reuse the existing connection between public catalogue content and sellable products.

Filtering must reflect actual product data, work with URLs and back/forward navigation, and handle zero results. Do not display fabricated ratings, stock, discounts, delivery promises or unavailable payment methods.

### Cart, pricing and checkout

Redesign cart and checkout comprehensively, including quantity/variant changes, invalid or unavailable items, coupon states, guest/customer choices, contact details, address selection, fulfillment, fees/taxes, payment options, order review, failure recovery and confirmation. Make their layouts and optional fields configurable without allowing CMS changes to bypass required transactional validation.

Keep the server authoritative for product availability, currency precision, totals, coupons, taxes, shipping, stock reservation and final order creation. Preserve payment idempotency, webhook verification, retry behavior and order history. Use the current payment integration contracts; configure provider branding only to the extent the actual provider supports it. Never store raw card details or accept a browser's claim that an order is paid.

### Customer account

Build a coherent customer area around the existing authentication and session system: sign-in/registration/recovery, configured social/email providers, profile/contact preferences, saved addresses, default address, wishlist, orders and order details, tracking, receipts/invoices and supported cancellation/return/support actions. Every visible action must perform a real, permission-checked operation.

Test customer A/customer B ownership boundaries, including addresses, order attachments, receipts and payment links. Preserve secure sessions and safe return URLs.

### Delivery, locations and branch pickup

Extend the existing address book and delivery engine. Support manual structured addresses as a complete fallback, optional validated coordinates/map selection, serviceable zones, estimates/fees, available time windows, delivery notes and tracking.

Model eligible pickup branches with CMS-managed public names, addresses, coordinates/directions, contact details, hours and availability. Distinguish public branches from warehouses unless an explicit mapping exists. Store the selected branch and a historical pickup/address snapshot on orders. Define collection readiness and customer/staff communication coherently with existing order states.

Branch eligibility, service areas, slot/capacity constraints and required selections must be enforced on the server. Existing pickup orders without a branch must continue to render safely. Handle disabled/deleted locations without losing historical order information.

Keep map/provider credentials in the existing secure integration system. Provide clear CMS setup status and functional manual-address/directions fallbacks when a map provider is absent or unavailable.

### Attachments and policies

Use the existing storage/upload architecture for product documents, inquiry references and supported order/payment attachments. Validate type, size and ownership; keep private receipts/customer files private. Bank-transfer evidence must not mark an order paid automatically. Configure shipping, collection, returns, contact and payment information through CMS with localization and safe links.

## Industry preset coverage

Inventory every entry in `BUSINESS_ACTIVITIES` and build a capability/page matrix. The current 23 activities are listed below. Presets provide editable defaults, not permanent restrictions; optional commerce or service capabilities should compose with the primary industry.

| Activity | Pages and content to consider |
| --- | --- |
| media | Works, case studies, services, team/equipment, inquiry briefs, news |
| agency | Services, capabilities, case studies, clients, team, quote/contact |
| products | Categories, products/specifications, offers, stock/ordering, downloads |
| food | Restaurant profile, categorized menu, item details, allergens/dietary information, modifiers/add-ons, offers, ordering, delivery/pickup and optional reservations |
| services | Service categories/details, packages, availability/booking where enabled, quote/contact |
| real_estate | Searchable listings, facts, galleries, locations, inquiry/viewing flows |
| construction | Services, sectors/capabilities, completed projects/case studies, certifications/downloads, quote requests |
| education | Programs/courses, schedules, instructors, enrollment/inquiry, resources and configurable purchase/booking paths |
| healthcare | Services, practitioners, locations, appointment/contact paths and informational content |
| events | Event listings/details, dates, venue information, packages/tickets or inquiry where configured |
| online_store | Full storefront, categories, offers, product details, cart, checkout and customer account |
| beauty | Services, price lists/packages, staff, galleries, appointments and optional retail |
| fitness | Programs/classes, timetables, trainers, packages/memberships and booking/purchase paths |
| automotive | Vehicles/parts or service catalogue, filters/specifications, projects, appointment/quote paths |
| logistics | Services, coverage, locations, quotes, delivery information and authorized tracking |
| travel | Destinations/tours, itineraries, dates, availability, booking/inquiry and policies |
| hotel | Accommodation, amenities, galleries, locations, offers and availability/reservation paths |
| law_firm | Practice areas, professionals, public case studies/articles and confidential inquiry |
| nonprofit | Causes, projects, campaigns, impact, participation and supported donation flows |
| pharmacy | Product/category information, offers and sales capabilities governed by explicit business rules |
| manufacturing | Products, capabilities, industries, specifications/certifications, distributors and RFQs |
| it_software | Solutions/products, pricing, documentation/downloads, case studies and demos/contact |
| other | Flexible generic content, collections and optional capabilities |

Use existing inquiry, catalogue, payment and scheduling systems where appropriate. If a reservation, ticket, enrollment, membership or donation capability is enabled, it needs a real validated workflow, relevant admin management and tests. Do not present fake availability, dead buttons or inquiry submissions labeled as confirmed bookings. Do not silently turn this into a separate LMS, clinical system or unrelated ERP.

## Implementation sequence

1. **Audit and feature matrix:** inspect AGENTS and relevant skills, inventory routes/components/settings/operations, review current pages in a browser, and label each requested feature as existing, extend, new or externally blocked. Record progress in this document or a companion checklist.
2. **Design/CMS foundation:** validated design and capability schema, compatible defaults/migrations, admin controls, public scoped theme/mode provider, preview/publish support, shared component contract and WhatsApp removal. Deliver an end-to-end CMS setting → preview → publish → public rendering slice.
3. **Public pages:** rebuild shell, home, contact, about/services, news, works and custom blocks section by section, with real CMS content and responsive states.
4. **Storefront and accounts:** product/category discovery, offers, filters, details, cart, account navigation/profile/addresses/orders and associated CMS controls.
5. **Checkout and fulfillment:** payments, delivery/location integration, multiple addresses, branch pickup, attachments, staff management and historical snapshots. Make additive, tested data migrations where needed.
6. **Industry templates:** complete all 23 preset entries and the optional capability matrix, prioritizing restaurant ordering/menu and construction services/projects. Demonstrate CMS customization after applying each preset.
7. **Verification and handoff:** complete route/settings coverage, accessibility and transaction tests, screenshots, implementation notes, migration guidance and accurate remaining limitations. Keep moving through the phases rather than stopping after a cosmetic pass.

## Completion criteria and testing

- Each visible feature has an admin control/content source, validated persistence, public rendering, a working action where relevant, and appropriate empty/error/disabled states.
- CMS changes survive reload and respect draft/published separation. Preview, publish, restore and cache invalidation work. Legacy websites continue to render.
- Light, dark, mixed and locked-switch configurations work with correct logos, text, native controls and portaled popups. Brand, shape, typography and motion presets are exercised.
- Every public route and all industry preset page types are inventoried. Verify 390, 768 and 1440-pixel layouts in both languages; include long/mixed text, menus, dialogs, filters and empty/large datasets. Test genuine touch emulation as well as desktop resizing.
- Use Axe on representative page types and critical expanded states, plus keyboard/focus tests, contrast/palette tests, reduced/off motion tests and performance checks.
- Exercise account ownership, address CRUD/defaults, guest/customer cart and checkout, unavailable stock, price changes, coupons, delivery zones/slots, branch pickup, failed payments, verified/idempotent webhooks, confirmation and tracking.
- Browser tests cover CMS edit → save → preview → publish → anonymous page, mode restrictions, feature-off behavior, restaurant flows and construction project pages. Validate all other presets at schema/render level and maintain explicit browser coverage for their distinctive pages.
- Use disposable `_test` databases and payment/provider stand-ins. Do not change production data, send real customer messages, charge cards or silently enable paid integrations to test the work.
- New nontrivial logic receives meaningful focused tests. Run the appropriate existing checks and production builds. Preserve the completed admin redesign and its route/interaction coverage.
- Use real available assets and content, with isolated sample fixtures for testing. Keep the site company-neutral and localizable. Do not add placeholder interactions and call them complete.

## Starting references

- `docs/ADMIN_MATERIAL_DESIGN.md` and `docs/ADMIN_UI_ROUTE_AUDIT.md`
- `.agents/skills/material-design-3-ui/SKILL.md`
- `.agents/skills/redesign-existing-projects/SKILL.md`
- Official Material guidance and current primary provider documentation when implementing integrations
- Installed Turborepo package documentation before changing Turbo configuration or commands, as required by AGENTS.md

Keep the work local and reviewable. Continue independently with the available information; ask concise questions only for genuine blockers or a preference that materially changes the design. External integration limitations must be reported honestly, with adapters/admin configuration/fallbacks completed where possible.

## Implementation tracking

Active route inventory, implementation details, verification and outstanding acceptance work are tracked in [WEB_REDESIGN_PROGRESS.md](WEB_REDESIGN_PROGRESS.md). The brief above remains the intended scope.
