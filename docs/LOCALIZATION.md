# Localization and copy

Admin, Web, and IT each own a complete Arabic and English interface dictionary. Business content keeps its English/Arabic storage.

## Where text lives

| Text                                                  | Location |
| ----------------------------------------------------- | -------- |
| Admin interface, including the setup wizard           | `apps/admin/locales/en.json` and `ar.json`; app copy is under `admin` |
| Website copy and activity wording                     | `apps/web/locales/en.json` and `ar.json`; website copy remains under `common`; activity overlays are in `website-activities.json` |
| IT dashboard and setup copy                           | `apps/it/locales/en.json` and `ar.json` |
| Generic labels and shared component defaults          | Each app's own `shared.common` and `shared.ui` namespaces in its English and Arabic files |
| Server error messages                                 | `admin.serverErrors` in Admin; Web and IT keep only their app-used messages in their own `server-errors.json` |
| Activity-specific wording                             | Admin's `admin-activities.json` and Web's `website-activities.json` |
| Company name, address, contacts, logos, legal numbers | Company settings in the database, never the locale files |

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
- that Admin server messages are translated;
- formatter behaviour.

It runs as part of `./run.sh test` and in CI.


## Interface languages

Each app has its own locale registry in `apps/{admin,web,it}/locales/registry.ts`, supporting English and Arabic (`"en"` and `"ar"`). Main interface copy lives in one JSON file per language; narrowly scoped activity overlays and runtime error catalogs remain app-local and separate. The `shared` namespaces keep generic and UI wording alongside app-specific copy without importing another app's locale files.

The admin preference selector uses the registry and persists a validated locale preference. The website editor chooses its published interface languages, primary language and per-language navigation/banner/contact wording. Website interface languages are separate from bilingual business content: existing English/Arabic content fields retain their data and fallback behavior.

Country names in phone selectors use `Intl.DisplayNames`; calling codes and validation use the shared international phone metadata. Stored phone values and document output use compact E.164 (`+97333115351`); search accepts `97333115351`. The example is a format illustration, not a default country. National inputs never include the calling code.


## App-local common labels

Each app's `shared.common` English and Arabic dictionaries contain the generic labels: actions, confirmation/loading states, navigation between records, basic field labels and document actions. Contextual copy such as “Save invoice changes”, “Back to clients” or a domain-specific empty state stays with its module. Each app owns its own copy so its locale data does not depend on another application.

Each app's `shared.ui` dictionary includes the labels used by shared controls. The app-local UI loader resolves regional tags such as `ar-BH` and `en-US` and covers the languages in that app's registry.

Shared selects, dialogs, confirmations, phone controls, file uploads and chart legends use `useUiCopy`. Upload prompts and remove-file labels follow the selected interface language in each app. The existing Admin, Web, and IT language providers supply that language; no new locale provider was introduced.

For a new generic label, add matching keys to the `shared.common` objects in all three apps' English and Arabic files. New shared controls can use `useUiCopy`; callers can use the app-local `getCommonTranslations(locale)`. Keep complete sentences and workflow-specific actions in their own module when their meaning differs.
