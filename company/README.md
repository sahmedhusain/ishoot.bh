# company/

Everything that belongs to one company lives here, never inside `apps/` or `packages/`. The admin and the website are generic: they read the company's name, colours, fonts and files from the database, and those come either from the first-run setup wizard or from a profile in this folder.

```
company/
  profiles/
    demo/                 Neutral fictional company (Northwind Studio). Default for seeds, CI and end-to-end tests.
    <name>/
      company.json        Identity and configuration (CompanySetting fields), short display name, brand file per slot
      theme.json          Primary and accent colours, fonts, corner radius, default light/dark mode
      assets/             brand/ (logos, icons, stamp, signatures), fonts/ (woff2), media/ (hero images)
      raw/                Original design sources (.ai, .zip…), never committed
  seed/                   Demo business data (seed.ts, seed-volume.ts, demo-staff.json, website-preview.cjs)
  tools/                  company-profile.ts: loads a profile and installs it into the database and upload storage
  scripts/                generate-demo-assets.cjs: rebuilds the demo profile's artwork from code
```

## Profiles

A step-by-step walkthrough (demo, your own profile, blank install) is in [docs/GETTING_STARTED.md](../docs/GETTING_STARTED.md).

| Command                                                                | What it does                                                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:reset --profile <name>`                                       | Fresh local database and files with demo data branded for the profile (local only)                                                       |
| `pnpm db:seed`                                                         | Fills an empty database with demo data for `COMPANY_PROFILE` (default `demo`)                                                            |
| `pnpm db:bootstrap`                                                    | Creates roles, permissions and the first admin. With no `COMPANY_PROFILE` the company starts blank and the admin shows the setup wizard. |
| `COMPANY_PROFILE=<name> pnpm db:bootstrap`                             | Same, and installs the profile (skips the wizard) when no company exists yet                                                             |
| `COMPANY_PROFILE=<name> COMPANY_PROFILE_OVERWRITE=1 pnpm db:bootstrap` | Re-applies a profile's identity, files and theme to an existing install                                                                  |
| `pnpm company:demo-assets`                                             | Regenerates the demo profile artwork                                                                                                     |

### company.json

```json
{
  "display": { "nameEn": "Acme", "nameAr": "أكمي" },
  "company": {
    "companyNameEn": "Acme Trading W.L.L.",
    "companyNameAr": "…",
    "defaultCurrency": "BHD",
    "invoicePrefix": "INV"
  },
  "assets": {
    "logo": "brand/logo-light.png",
    "darkLogo": "brand/logo-dark.png",
    "icon": "brand/icon-light.png",
    "darkIcon": "brand/icon-dark.png",
    "stamp": "brand/stamp.png",
    "signature": "brand/signature.png"
  }
}
```

`company` takes any `CompanySetting` field except the file URLs, which are filled from `assets`. Useful ones beyond identity: `businessActivity` (one of the activities in `packages/database/src/website-presets.ts`, such as `media` or `products`), `contentLanguages` (`["ar", "en"]`, `["ar"]` or `["en"]`) and `primaryLanguage`.

| Slot                | Artwork                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `logo` / `darkLogo` | The **text logo only** (wordmark), for light and dark backgrounds. The apps show the icon beside it, so it must not contain the icon. |
| `icon` / `darkIcon` | The square mark on its own; `icon` is also the browser icon                                                                           |
| `stamp`             | The company seal printed on approved documents                                                                                        |
| `signature`         | The authorised signatory's signature                                                                                                  |

Optional extras inside `assets/`: `brand/signatures/<staff key>.png` (demo staff signatures), `media/banners/*` (website hero images), `media/clients/<slug>.png` (client logos for the demo).

### theme.json

```json
{
  "primary": "#312E81",
  "accent": "#4F46E5",
  "radius": "lg",
  "defaultMode": "system",
  "fonts": {
    "body": { "kind": "google", "family": "IBM Plex Sans Arabic" },
    "heading": {
      "kind": "upload",
      "family": "Brand Display",
      "files": [{ "weight": 400, "file": "fonts/display-regular.woff2" }]
    }
  }
}
```

Fonts are `system`, a `google` family (any family in `FONT_LIBRARY` in `packages/database/src/constants/theme.ts`), or `upload` with font files from `assets/`. Optional: `buttonShape` (`square`, `rounded`, `pill`), `fontScale` (`sm`, `md`, `lg`), `headingWeight` (400–800), `headingCase` (`normal`, `uppercase`) and `surface` (`tinted`, `neutral`).

### Files

Brand files must be PNG, JPEG or WebP, and fonts WOFF2, WOFF, TTF or OTF. Fonts whose licence forbids redistribution (such as Thmanyah) stay out of git: keep them in the profile's untracked files. SVG is not accepted, because an uploaded SVG can carry script; convert it to PNG first, for example at 1200 px wide. Installing a profile copies each file into upload storage under a content-hashed name, so installing it twice reuses the same file.

## Northwind preset demos

All preset demos reuse `profiles/demo` (Northwind Studio), its staff, logos and signatures. No copies of company identity or artwork are needed. The selected activity controls the website, catalogue route, hero, enquiry questions, sales pipeline, recommended modules and theme.

```sh
pnpm db:demo:list
pnpm db:reset --demo products
pnpm db:reset --demo law_firm
pnpm db:reset --demo all
pnpm db:reset --demo hotel --style daylight
pnpm db:reset --demo pharmacy --light
```

These reset commands ask before deleting the configured local database and uploads. To fill an already empty database without resetting it, use `SEED_PRESET=all pnpm db:seed`. `SEED_STYLE` overrides the recommended visual style; `SEED_VOLUME=off` omits generated operational history. Invalid preset/style names fail before a reset starts. `--demo` and `SEED_PRESET` always select the shared Northwind profile, even when `COMPANY_PROFILE` names another company.

Available activity presets: `media`, `agency`, `products`, `food`, `services`, `real_estate`, `construction`, `education`, `healthcare`, `events`, `online_store`, `beauty`, `fitness`, `automotive`, `logistics`, `travel`, `hotel`, `law_firm`, `nonprofit`, `pharmacy`, `manufacturing`, `it_software`, `other`.

The `all` demo enables all 14 modules and all homepage sections, pages and enquiry questions. Its catalogue contains all 23 activities (276 additional entries), 69 services and 92 articles. The website uses the media layout initially; layouts, business activities and visual themes are single selections, so incompatible values cannot all render at once. Use individual demos or a style override to inspect each presentation.

Full seeds retain the existing CRM, finance, HR, payroll, approvals, assets, requests and calendar history, and add scenarios for the enabled modules:

| Area | Added fixtures and cases |
| --- | --- |
| Website | 12 bilingual catalogue entries and 4 articles per activity; featured, published, scheduled and draft content |
| Products and inventory | 12 products per applicable activity (84 in `all`); variants, services without stock, inactive items, low/zero stock, expired/expiring batches, outlet transfers, damage write-offs, counts awaiting review/approved/cancelled |
| Purchasing | 16 suppliers, requisitions and purchase orders; 4 RFQs with quotes; draft, approval, sent, partial/full receipt, cancelled, draft bills, partial/full supplier payment |
| Store and delivery | 24 customers with addresses and wishlists, 72 orders across website/phone/WhatsApp/POS; coupons active/expired/disabled, pickup/delivery, paid/unpaid, packing, in transit, failed delivery, cancellation, return, partial/full refund; 3 zones, weekly slots, 3 vehicles, a driver, manual courier, route sheets and reconciled delivery cash |
| Tasks | 12 projects, 96 tasks and comments; every project/task status, urgency, overdue/future work and unassigned tasks |
| Marketing | 12 campaigns and draft broadcasts, 3 customer segments; every campaign status and attributed store orders |
| PR | 18 media contacts and coverage records with positive/neutral/negative sentiment |
| Legal | 16 matters with notes; all kinds and statuses, upcoming/overdue dates and closed outcomes |

Service desk defaults and six bilingual saved replies are also included. No live payment gateways, courier bookings, broadcast sends or synthetic provider analytics are created. Security/session/token tables are populated by normal application use, not by demo business fixtures. Customer accounts have verified fictional addresses at `example.invalid` but no shared password or pre-created session.

For an isolated full seed using the existing test database helper (it recreates only the named disposable database):

```sh
SEED_PRESET=all SEED_VOLUME=on E2E_UPLOAD_ROOT=/tmp/demo-all-uploads \
  node tests/e2e/prepare-db.cjs seeded platform_demo_all_test
```

With `DATABASE_URL` and `DIRECT_URL` pointing at that disposable database, run `SEED_PRESET=all pnpm db:demo:check` to check preset settings, content counts, inventory ledger and reservations, order arithmetic, supplier payments and workflow coverage. It refuses production or non-local/non-test database names. For a light seed, also set `SEED_VOLUME=off`. The existing `pnpm db:check-integrity` covers finance, HR, approvals and linked records; the E2E helper adds a driver login without an employee after seeding, so exclude that test-only account when auditing staff integrity.

## Guard

`node scripts/check-brand-neutral.cjs`, which also runs in CI, fails when any file outside `company/` contains a brand file, or a profile's name, domain, registration numbers, theme colours or font family.
