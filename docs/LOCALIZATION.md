# Localization and copy

Both apps are fully bilingual (Arabic right-to-left, English left-to-right) and company-neutral.

## Where text lives

| Text                                                  | Location                                                                                                                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website copy                                          | `packages/locales/src/en.json`, `ar.json` (media wording)                                                                                                                                |
| Website wording per activity                          | `packages/locales/src/website-activities.json`: a shared layer for every non-media activity, then each activity's own; the company's catalogue names from the website settings go on top |
| Admin interface, including the setup wizard           | `packages/locales/src/admin/en.json`, `ar.json`                                                                                                                                          |
| Server error messages                                 | `serverErrors` in the admin dictionaries, used through `serverMessages` and `serverTemplates` from `@platform/locales`                                                                   |
| Shared component defaults                             | `packages/ui/src/copy`                                                                                                                                                                   |
| Company name, address, contacts, logos, legal numbers | Company settings in the database, never the locale files                                                                                                                                 |

## Content languages

A company writes its content in Arabic, English or both (`contentLanguages`, chosen in the setup wizard). This is separate from the interface language of the admin, which every user can switch. With one content language, forms show one field per English/Arabic pair, the server copies the text to both columns (`mirrorBilingual` in `packages/database/src/constants/languages.ts`), and the website serves only that language. Text that may be empty on one side is read with `pickText`, which falls back to the other language.

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
