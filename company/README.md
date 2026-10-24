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

| Command | What it does |
|---|---|
| `pnpm db:reset --profile <name>` | Fresh local database and files with demo data branded for the profile (local only) |
| `pnpm db:seed` | Fills an empty database with demo data for `COMPANY_PROFILE` (default `demo`) |
| `pnpm db:bootstrap` | Creates roles, permissions and the first admin. With no `COMPANY_PROFILE` the company starts blank and the admin shows the setup wizard. |
| `COMPANY_PROFILE=<name> pnpm db:bootstrap` | Same, and installs the profile (skips the wizard) when no company exists yet |
| `COMPANY_PROFILE=<name> COMPANY_PROFILE_OVERWRITE=1 pnpm db:bootstrap` | Re-applies a profile's identity, files and theme to an existing install |
| `pnpm company:demo-assets` | Regenerates the demo profile artwork |

### company.json

```json
{
  "display": { "nameEn": "Acme", "nameAr": "أكمي" },
  "company": { "companyNameEn": "Acme Trading W.L.L.", "companyNameAr": "…", "defaultCurrency": "BHD", "invoicePrefix": "INV" },
  "assets": { "logo": "brand/logo-light.png", "darkLogo": "brand/logo-dark.png", "icon": "brand/icon-light.png",
              "darkIcon": "brand/icon-dark.png", "stamp": "brand/stamp.png", "signature": "brand/signature.png" }
}
```

`company` takes any `CompanySetting` field except the file URLs, which are filled from `assets`. Useful ones beyond identity: `businessActivity` (one of the activities in `packages/database/src/website-presets.ts`, such as `media` or `products`), `contentLanguages` (`["ar", "en"]`, `["ar"]` or `["en"]`) and `primaryLanguage`.

| Slot | Artwork |
|---|---|
| `logo` / `darkLogo` | The **text logo only** (wordmark), for light and dark backgrounds. The apps show the icon beside it, so it must not contain the icon. |
| `icon` / `darkIcon` | The square mark on its own; `icon` is also the browser icon |
| `stamp` | The company seal printed on approved documents |
| `signature` | The authorised signatory's signature |

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
    "heading": { "kind": "upload", "family": "Brand Display", "files": [{ "weight": 400, "file": "fonts/display-regular.woff2" }] }
  }
}
```

Fonts are `system`, a `google` family (any family in `FONT_LIBRARY` in `packages/database/src/constants/theme.ts`), or `upload` with font files from `assets/`. Optional: `buttonShape` (`square`, `rounded`, `pill`), `fontScale` (`sm`, `md`, `lg`), `headingWeight` (400–800), `headingCase` (`normal`, `uppercase`) and `surface` (`tinted`, `neutral`).

### Files

Brand files must be PNG, JPEG or WebP, and fonts WOFF2, WOFF, TTF or OTF. Fonts whose licence forbids redistribution (such as Thmanyah) stay out of git: keep them in the profile's untracked files. SVG is not accepted, because an uploaded SVG can carry script; convert it to PNG first, for example at 1200 px wide. Installing a profile copies each file into upload storage under a content-hashed name, so installing it twice reuses the same file.

## Guard

`node scripts/check-brand-neutral.cjs`, which also runs in CI, fails when any file outside `company/` contains a brand file, or a profile's name, domain, registration numbers, theme colours or font family.
