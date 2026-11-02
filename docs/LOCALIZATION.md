# Localization and copy

Both apps retain complete Arabic and English interface dictionaries. Business content keeps its English/Arabic storage.

## Where text lives

| Text                                                  | Location                                                                                                                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Common labels shared by both apps | `packages/locales/src/common/en.json`, `common/ar.json` |
| Website copy                                          | `packages/locales/src/en.json`, `ar.json` for website-specific wording, composed with common copy                                                                                                                                |
| Website wording per activity                          | `packages/locales/src/website-activities.json`: an optional shared layer, then the explicitly selected activity's own; the company's catalogue names from the website settings go on top |
| Admin interface, including the setup wizard           | `packages/locales/src/admin/en.json`, `ar.json` for module wording; use the composed `@platform/locales/admin/en` and `/ar` exports                                                                                                                                          |
| Server error messages                                 | `serverErrors` in the admin dictionaries, used through `serverMessages` and `serverTemplates` from `@platform/locales`                                                                   |
| Shared component defaults                             | `packages/locales/src/ui/en.json`, `ar.json` plus common copy; `packages/ui/src/copy/use-ui-copy.ts` selects the active locale                                                                                                                                                                   |
| Company name, address, contacts, logos, legal numbers | Company settings in the database, never the locale files                                                                                                                                 |

## Content languages

A company writes its content in Arabic, English or both (`contentLanguages`, chosen in the setup wizard). This is separate from the interface language of the admin, which every user can switch. With one content language, forms show one field per English/Arabic pair, the server copies the text to both columns (`mirrorBilingual` in `packages/database/src/constants/languages.ts`), and paired content forms follow that setting. Published website interface languages are selected independently. Text that may be empty on one side is read with `pickText`, which falls back to the other language.

## Rules

- Never write display text inline in components; add a key to both languages.
- Dynamic sentences use `formatMessage(template, values)` with named placeholders (`{companyName}`, `{number}`, `{date}`). Both languages must use the same placeholders. Zero, false and null are formatted, and `$` and braces in values are kept literally.
- Digits are Western in both languages, including PDFs.
- Stored notifications keep a translation key and parameters, so they follow the reader's current language.
- Generated CSVs, calendar names, emails and metadata use the configured company identity.
- No locale string may name a company, an address or a registration number; the brand check (`./run.sh test brand`) enforces this for every company profile.

## Checks

`./run.sh test copy` checks:

- key and placeholder parity between the languages;
- hardcoded display text in JSX, attributes, component defaults and messages;
- that every server message is translated;
- formatter behaviour.

It runs as part of `./run.sh test` and in CI.


## Interface languages

The locale registry is `packages/locales/src/registry.ts`, supporting English and Arabic (`"en"` and `"ar"`). Arabic and English keep their existing base/admin/UI dictionary files.

The admin preference selector uses the registry and persists a validated locale preference. The website editor chooses its published interface languages, primary language and per-language navigation/banner/contact wording. Website interface languages are separate from bilingual business content: existing English/Arabic content fields retain their data and fallback behavior.

Country names in phone selectors use `Intl.DisplayNames`; calling codes and validation use the shared international phone metadata. Stored phone values and document output use compact E.164 (`+97333115351`); search accepts `97333115351`. The example is a format illustration, not a default country. National inputs never include the calling code.


## One source for common labels

`packages/locales/src/common/en.json` and `common/ar.json` are the canonical sources for 46 generic labels: actions, confirmation/loading states, navigation between records, basic field labels and document actions. Contextual copy such as “Save invoice changes”, “Back to clients” or a domain-specific empty state stays with its module.

The common binding map (`packages/locales/src/common-bindings.json`) supplies 443 existing web/admin/UI lookup paths. Those public paths remain compatible while their duplicated literals have been removed from the scoped JSON files. The raw JSON files are partial dictionaries; application code and fixtures must use the composed exports rather than importing raw JSON. `common.cjs` is also usable by the existing Node maintenance scripts without loading React or TypeScript.

Arabic and English retain separate JSON dictionaries for common, UI and module copy. The shared UI loader resolves regional tags such as `ar-BH` and `en-US`, caches each resolved dictionary, and covers the languages in the registry.

Shared selects, dialogs, confirmations, phone controls, file uploads and chart legends use `useUiCopy`. Upload prompts and remove-file labels follow the selected interface language in both applications. The existing admin and website language providers supply that language; no new locale provider was introduced.

For a new generic label, add matching keys to the common English/Arabic JSON files. New shared controls can use `useUiCopy`; callers can use `getCommonTranslations(locale)`. Add a binding only to preserve an existing scoped lookup. Keep complete sentences and workflow-specific actions in their own module when their meaning differs.
