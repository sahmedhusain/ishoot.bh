# Reusable copy and company identity

Interface messages belong in the English and Arabic JSON dictionaries in `packages/locales/src`. Shared component defaults live in `packages/ui/src/copy`. Company names, contact information, artwork and website addresses come from company settings. Meeting participants come from the authenticated account and company record; meeting times and location are entered explicitly.

Use `formatMessage(template, values)` from `@platform/locales` for dynamic sentences. Name parameters for their meaning, such as `{companyName}`, `{number}`, `{rate}` and `{date}`. Both languages must contain the same placeholders, including repeated occurrences. The formatter substitutes all occurrences once, preserves literal `$` and braces inside supplied values, supports zero/false/null, and rejects missing or inherited values. HTML email values must still be escaped for their destination; CSV exports retain formula-injection protection.

Company delivery messages, metadata, logo descriptions, financial CSVs and calendar names use the configured company identity. Public site URLs use `WEB_URL` when configured and otherwise the company's website. Calendar identifiers use the deployment hostname. Financial labels use the relevant stored VAT/exchange margin or omit a rate when a report aggregates multiple rates.

Canonical server error text is exported as `serverMessages` and `serverTemplates` from the locale package. Code references the catalog instead of duplicating sentences. Existing numeric error placeholders remain compatible with the error translator. Eleven pre-existing Arabic error templates intentionally omit technical/provider details; the localization check records those precise exceptions.

Stored notifications include a translation key and structured parameters so a recipient can change language after receiving a message. Scheduled reimbursements and payment notices now follow this pattern. Existing company documents and free-form user content retain their recorded wording.

## Verification

Run `pnpm test:copy` to check locale key/placeholder parity, hardcoded display text and formatter/export behavior. It is included in the quality workflow. The source audit checks JSX text, display attributes, component defaults, literal/dynamic messages and prose in copy properties across admin, website and shared packages. It distinguishes protocols, IDs, styles, enums and diagnostics from interface copy. It checks 612 current source files and has no approved list of leftover interface sentences.

Additional checks passed for admin/website types and lint, platform permissions, uploads, dashboards, navigation, audit security, HRMS, every approval type and local rollback tests for communications, calendars, account security and finance. English and Arabic letterhead, letter and announcement PDFs were generated successfully.

The initial-company JSON and development seeds describe the example deployment. A new company supplies its own bootstrap settings, deployment URLs and assets, then maintains them through company settings. Each installation currently has one company record. Supporting a different jurisdiction also requires configuring the applicable financial and employment rules; this copy audit preserves the existing accounting calculations.

The website database integration script requires a disposable database ending in `_test`; it was not run against the existing development data. Signed-in browser interaction was not part of this audit.
