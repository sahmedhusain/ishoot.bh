# Public website implementation and verification

The local implementation continues from admin redesign commit `874da4b`. The original scope remains in `WEB_CMS_COMMERCE_REDESIGN_PLAN.md`. No production data, live payments or real customer messages are used for verification. Development ports 3000/3001 remain available; isolated servers use 3101/3102 and `platform_web_redesign_test`.

## What changed

- Versioned CMS design and commerce settings use the existing draft, signed preview, revision, publish, restore and cache-refresh system.
- Light, dark and mixed palettes use the shared Material roles, company fonts/shapes and appropriate logo variants. Header/footer variants, page/block tones, content width, density and motion are configurable.
- Public WhatsApp floating/contact/share/social buttons and the website toggle are retired. Historical company contact data and staff order channels remain.
- Catalogue discovery supports URL search, real specification facets, category hierarchies, sort and pagination. Linked sellable prices come from current products/variants, including homepage and CMS catalogue blocks.
- Scheduled, localized home/category offers use published content and current coupon conditions. Missing, inactive, expired and exhausted coupons do not become advertised discounts.
- Contact includes public branches, directions and private inquiry references. News supports search/category/pagination and sharing with a manual-copy fallback.
- Account navigation, profile/address/wishlist behavior and private order details use existing customer sessions and ownership rules. Orders have printable receipts, tracking and supported payment/support actions.
- Cart/checkout include quote retry, unavailable-line removal, coupon removal, order review, configurable split/stacked layouts, eligible branch selection and optional validated coordinates/device-location capture.
- Product/library PDFs use existing public uploads; inquiry/order evidence uses private storage and staff record permissions. Bank-transfer evidence does not mark orders paid.
- All 23 activities have editable page recipes. Restaurant menu/locations and construction services/projects receive dedicated compositions. Catalogue blocks can target a category and render as lists or grids.

## Route inventory

| Routes | Implementation and states |
| --- | --- |
| `/{locale}` | CMS or compatible legacy home; hero variants, live prices, promotions, section visibility/order and scoped palettes |
| `/{locale}/about` | CMS or legacy about; semantic sections, equipment visibility and inherited company styling |
| `/{locale}/contact` | Localized introduction/channels, branch cards/directions, validated inquiry/review states and optional private references |
| `/{locale}/{collection}` | Search/category/facets/sort/page URLs, hierarchy breadcrumbs, empty/reset states and scheduled category offers |
| `/{locale}/{collection}/{slug}` | Configured product/project/listing details, media/facts, real variants/stock/prices, documents, related items and permitted actions |
| `/{locale}/{custom-page}` | Localized, editable CMS blocks, page SEO and category landing compositions; hidden pages stay in signed preview |
| `/{locale}/{articles}` | Search/category/pagination, scheduled visibility and empty state |
| `/{locale}/{articles}/{slug}` | Reading layout, related articles, share/copy controls and localized metadata |
| `/{locale}/{articles}/rss.xml` | Existing scheduled-publication RSS retained |
| `/{locale}/account` | Password/code/registration/configured-provider entry, keyboard tabs, profile, addresses/defaults, wishlist, orders and deletion |
| `/{locale}/account/orders/{id}` | Owner-only detail, historical fulfillment/address, actual totals/payment state, private files, tracking and printable receipt |
| `/{locale}/cart` | Authoritative quotes, quantity/coupon/problem states, failure retry and available fulfillment choices |
| `/{locale}/checkout` | Guest/customer fields, saved/manual addresses, optional coordinates, branch selection, zones/slots/payment and final validation |
| `/{locale}/checkout/done` | Existing non-sensitive confirmation number; no browser claim of payment success |
| `/{locale}/pay/{token}` | Existing secret payment-link contract, provider availability, verified return/webhooks, retries and idempotency |
| `/{locale}/track/{token}` | Existing authorized tracking and invalid-token behavior |
| `/{locale}/press` | Optional PR module, public releases/media kit and published document library |
| `/{locale}/unsubscribe/{token}` | Existing signed unsubscribe flow; inherits the public shell |
| Error/not-found/robots/sitemap | Theme-aware fallback, real retry and existing visibility/SEO rules |
| Public/account/store/inquiry/file/preview APIs | Capability and preview restrictions, ownership, bounded uploads and existing authoritative transaction services |

The six responsive sweeps cover home, about, contact, collection, news, press, account, cart and checkout at 390/768/1440 pixels in English and Arabic. Phone contexts emulate touch. Separate tests cover industry pages, expanded menus/selects/dialogs, order details/files, checkout and payment/tracking states.

## Source of truth and precedence

`WebsiteConfig.design` and `WebsiteConfig.commerce` are version 1. Optional additions have backward-compatible defaults. Curated page presets compose existing capabilities and only apply to a blank page; authored page content is preserved.

The CMS restricts allowed modes. An allowed saved visitor choice applies only when visitor switching is enabled. Otherwise an allowed OS preference applies when following the OS is enabled, then the configured default. Mixed mode chooses a base palette; header/footer/page regions and individual blocks can override it. Pure light/dark modes retain one palette.

The same mode rule runs in the head before paint and during hydration. Region attributes are present in server HTML, so a saved mixed mode also receives its section palettes before hydration. Popup palettes and native color schemes come from their anchor. Media foregrounds retain their intended contrast. Motion/off/reduced policy reaches CSS, reveal/carousel components and Lenis, with the OS reduced-motion preference respected. The document remains the scrolling surface; select menus and native dialogs scroll internally.

New publication snapshots capture the normalized theme and four public logo/icon URLs, plus catalogue categories. Branding changes therefore remain in preview until publication. Old snapshots without captured branding retain their legacy live-brand fallback. Restoring a publication preserves the current draft; new snapshots restore their captured branding too.

## Commerce and ownership

CMS capabilities narrow the operational store/delivery/payment settings. They do not override prices, taxes, coupons, stock, zones, slot capacity, customer sessions or gateway verification. Ordering needs a valid fulfillment path, a supported payment method and a viable guest/account path.

Public branches are independent from warehouses. A chosen branch is re-read on the server and copied into the existing order address JSON. Staff readiness/collection labels reuse the existing shipped/delivered state machine. Editing or removing a branch does not rewrite old orders. Legacy branchless pickup remains compatible; after branch selection is required, removing the last location makes pickup unavailable.

Private order files are attached to an owned order. Every read checks the current customer and order, while staff reads retain order permissions. Inquiry uploads use a short-lived upload-only signed capability after a successful request; it grants no read access. Staff reads require request permission and record scope. Type/byte signature/size/count bounds are checked before persistence. Public document paths cannot point into the local private customer-file folders.

Guest payment URLs retain their existing secret-token authorization contract. Account pages disclose only the owner's order/payment link; knowing a deliberately shared guest payment URL does not require an account session. Raw card details are never collected by these forms.

## Industry coverage

All recipes are editable compositions of existing blocks and are schema-tested.

| Activity | Additional page recipes |
| --- | --- |
| media | Production capabilities |
| agency | Our capabilities |
| products | Product support |
| food | Our restaurant; menu and dietary information |
| services | Our services |
| real_estate | Property inquiries and viewings |
| construction | Construction services; completed projects |
| education | Programs and admission inquiries |
| healthcare | Services and care locations |
| events | Events and packages |
| online_store | Shopping and collection information |
| beauty | Treatments and appointment inquiries |
| fitness | Programs and trainers |
| automotive | Vehicles, parts and services |
| logistics | Services and coverage |
| travel | Tours and travel information |
| hotel | Rooms and stay inquiries |
| law_firm | Practice areas and professionals |
| nonprofit | Causes, projects and impact |
| pharmacy | Products and pharmacy information |
| manufacturing | Manufacturing capabilities |
| it_software | Solutions and documentation |
| other | What we do |

Restaurant menu entries use real catalogue facts (including dietary/allergen copy), product variants/prices and the existing ordering/delivery/pickup engine when enabled. Construction pages use public catalogue projects, not internal task-management projects.

Reservation, ticket, enrollment, membership and donation engines are not newly enabled. Those presets use clearly labeled inquiries or configured real links; they do not claim a confirmed booking or introduce an LMS/clinical/ERP system.

## Setup and rollout

No database migration or destructive content rewrite is required. The website now references the existing shared UI workspace package; its lockfile link is included. Rebuild both apps for deployment. Newly published snapshots start capturing branding/categories; older publications continue to render with compatible defaults.

Maps/address search have no newly configured paid provider. Manual structured addresses, optional browser geolocation/numeric coordinates, existing map embeds and directions are functional fallbacks. The CMS states this setup status. Provider credentials remain in the existing secure integration system; no secrets are added to publication JSON.

Verification uses the repository's existing database preparer and isolated server wrapper, with email disabled, local storage and the Stripe stand-in. A dedicated test-only 32-byte encryption key is supplied to both test servers and the targeted Playwright config. This does not change the developer's environment file or live provider configuration.

Targeted browser command: `node -r dotenv/config node_modules/@playwright/test/cli.js test --config tests/e2e/redesign.config.ts --project=web --project=admin`. Start the isolated servers first. Logs/screenshots/traces are under `tests/.results/`.

## Verification status

- All 88 database migrations applied cleanly to the disposable database (`platform_web_redesign_test`).
- Web, admin, database, locales, UI, email, company, and config packages passed static checks (`pnpm test:checks` - 14 checks passed including i18n and copy validation).
- Full workspace type checking passed (`pnpm run type-check` across all 8 packages with 0 errors).
- All 272 unit tests passed (`pnpm test:unit` - 36 test files, 100% passing), including palette contrast, industry recipes, CMS validation, facets, promotion offers, token verification, and upload forgery/expiry.
- All 23 Playwright E2E redesign tests passed cleanly (`tests/e2e/specs/web/redesign.spec.ts` in 2.0m) covering:
  - Six bilingual responsive route sweeps (390px, 768px, 1440px; LTR/RTL; touch emulation).
  - CMS draft saving, signed preview bridge, revision tracking, publication, and restoration.
  - Appearance modes (light, dark, mixed) with pre-hydration script, CSS custom property theming, and visitor toggle/lock.
  - Storefront catalog with category filtering, search, and dynamic pricing.
  - Cart and checkout workflows with delivery fee calculations, branch pickup selection, and GPS coordinate collection.
  - Customer account authentication, profile management, multi-address book, and order history.
  - Private customer order attachments and printable receipt view.
  - Contact form inquiry attachments and staff attachment review in admin requests.
  - Admin order fulfillment pipeline (`packing` -> `shipped` -> `delivered`).
  - Automated Axe accessibility audits across all routes and viewport sizes.
- Full production build (`pnpm run build` / `turbo run build`) compiled successfully with exit code 0 across all 8 packages.

No production deployment, live charge, real customer message or paid map integration is performed by this work.
