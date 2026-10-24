# Localization and copy

Both apps are fully bilingual (Arabic right-to-left, English left-to-right) and company-neutral.

## Where text lives

| Text | Location |
|---|---|
| Website copy | `packages/locales/src/en.json`, `ar.json` |
| Admin interface, including the setup wizard | `packages/locales/src/admin/en.json`, `ar.json` |
| Server error messages | `serverErrors` in the admin dictionaries, used through `serverMessages` and `serverTemplates` from `@platform/locales` |
| Shared component defaults | `packages/ui/src/copy` |
| Company name, address, contacts, logos, legal numbers | Company settings in the database, never the locale files |

## Rules

- Never write display text inline in components; add a key to both languages.
- Dynamic sentences use `formatMessage(template, values)` with named placeholders (`{companyName}`, `{number}`, `{date}`). Both languages must use the same placeholders. Zero, false and null are formatted, and `$` and braces in values are kept literally.
- Digits are Western in both languages, including PDFs.
- Stored notifications keep a translation key and parameters, so they follow the reader's current language.
- Generated CSVs, calendar names, emails and metadata use the configured company identity.
- No locale string may name a company, an address or a registration number; the brand check (`pnpm test:brand`) enforces this for every company profile.

## Checks

`pnpm test:copy` checks:
- key and placeholder parity between the languages;
- hardcoded display text in JSX, attributes, component defaults and messages;
- that every server message is translated;
- formatter behaviour.

It runs as part of `pnpm test` and in CI.
