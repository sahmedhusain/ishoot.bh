# Public website final design audit

Reviewed 4 October 2026. Scope: the public English and Arabic website, homepage, About, Works, project detail, Contact, shared navigation/footer, legal documents, review popup, and motion/hover behavior. Admin screens are outside this audit.

The approved direction remains photography first, the existing green identity and Thmanyah typography, alternating light/dark sections, sloped joins, and restrained motion.

## Changes from the final audit

- Legal popups now use native modal dialogs: keyboard focus containment, Escape dismissal, focus restoration, body scroll restoration, and top-layer placement above navigation. A dark title bar and light reading surface improve document contrast. Scrolling remains inside the document, with a reachable close action.
- Both database formats are supported: HTML rich text gets explicit heading, paragraph, list, link, quote, and table styles; plain text preserves paragraph breaks and turns numbered clauses with colon-delimited titles into headings. This fixes the seeded policies previously appearing as one unformatted block. Policy wording remains database controlled.
- Client logos have no visible tile/container background. Original colored artwork is retained; a selective SVG contrast mask lifts neutral dark ink to white and gently lifts the deepest colored shadows without hue inversion. A subtle edge shadow separates remaining detail from the background. Known monochrome Seef/Four Seasons artwork uses an explicit white treatment configured in logo-contrast.json. No global inversion, grayscale, or desaturation is applied. The single-row continuous loop, pause control, hover/focus pause, duplicate accessibility suppression, and reduced-motion static scrolling remain.
- About no longer repeats its subtitle when the database story starts with the same sentence. Replaced a reference to a missing portrait file with an available camera image and a studio caption.
- Contact retains a clear studio-information/form split and database-managed introduction, services, contact details, and response guidance. Removed the duplicated sidebar response message and the footer invitation linking back into the same contact page. Removed terminal-style form decoration and unsupported delivery promises from success copy.
- Form intents, services, and ratings now expose visible keyboard focus. Rating inputs/buttons have localized accessible names and touch-sized targets. Review popup now also uses a native dialog, named close/rating controls, associated field labels, and localized fallback errors.
- Hero, footer, navigation, logos, portfolio, preview controls, empty states, 404 actions, and SEO constants use bilingual locale JSON rather than inline copy. Removed unreachable literal fallbacks, because translation lookup returns a key when absent.
- Footer company name and commercial registration now use actual company settings rather than locale-file identity constants. Removed duplicated punctuation after company names.
- Website default editorial fields moved from TypeScript into website-default-copy.json without changing default values.
- The unused legacy statistics component no longer embeds conflicting numerical claims; it forwards CMS statistics to the shared section.
- FAQ expansion honors reduced motion, entrance delays are capped, and answers keep no internal divider. Statistics use the shared reveal and no longer scale on hover or display a misleading pointer cursor.
- Action arrows receive a small hover movement only on fine pointers with motion enabled. Portfolio/service images retain modest, motion-safe hover zoom. Removed excessive hover scaling in the legacy CTA and simplified language-switcher feedback.
- The floating scrollbar is below modal layers and respects reduced motion for track jumps. Fixed header/back-to-top layers remain above public sections.

## Content-source inventory

| Content | Source | Finding |
| --- | --- | --- |
| Hero slides, media, labels/links | Published database website snapshot | Dynamic; fallback copy is locale JSON |
| Homepage section visibility/order | Published website configuration | Dynamic; duplicate CTA section remains excluded |
| Portfolio titles, descriptions, categories, media, credits | Published database snapshot | Dynamic; role labels and all-category constants are JSON |
| Company story, mission/vision, CEO identity/quote | Company settings | Dynamic, with locale JSON fallbacks |
| Equipment, statistics, FAQs, reviews, client artwork | Database | Dynamic; legacy hardcoded statistic values removed |
| Contact title/introduction/hours/response/services | Website configuration | Dynamic; empty values are not invented |
| Contact email/phone/address/WhatsApp, legal documents, registration/name | Company settings | Dynamic |
| Navigation, buttons, field labels, validation, empty states, SEO defaults | English/Arabic locale JSON | Constants centralized and checked for missing keys |
| Default website editorial fields | Database package website-default-copy.json | Defaults separated from configuration/schema logic |
| Production URLs, route identifiers, asset paths, enum values, year/slide numbers, punctuation | Code/configuration | Structural values, not editorial text |

CMS records may themselves contain seeded sample copy. Moving a string into the database does not establish its factual provenance. This audit preserves published legal wording, numerical claims, company records, and testimonials. In particular, privacy wording makes assertions about encryption, backups, and cookies that were not independently verified here.

## Validation

- Source TypeScript passes using a temporary configuration excluding generated `.next` types. Normal generated-type validation had an existing routes.d.ts/LayoutProps failure during earlier checks; this audit did not change generated files.
- All literal translation lookups in public TSX source resolve in both locale files.
- Whitespace/diff checks pass.
- Current browser: Contact introduction, form hierarchy, response copy, and absence of the repeated footer invitation inspected. Both English legal popups visibly render separate numbered headings and paragraphs on the light surface. Native modal state, hidden body overflow, no horizontal document overflow at the observed 627px viewport, and Escape/focus restoration confirmed.
- Earlier session checks: homepage had no horizontal overflow at 375, 768, 1024, and 1440px; Arabic at 375px. Works, About, and Contact sloped rules and footer joins rendered. Header/back-to-top centers were unobstructed at FAQ/footer and back-to-top returned scrollY to zero. Logo loop/pause and all 16 artwork loads were verified before this final removal of tile backgrounds.

## Final browser checks and verification limits

The intermittent preview recovered. Final checks covered:

- Arabic Contact at 1440px and 375px: no horizontal overflow, no duplicate footer invitation, localized rating names. Arabic terms display five clause headings and close with Escape.
- English Works at 375px and 1440px, About at 1440px: no horizontal overflow and clear page hierarchy.
- The isolated 3004 preview confirmed the final About camera image loads and the previously repeated introductory sentence occurs once.
- Homepage logo slots are transparent; all 16 originals loaded. Loop pause works. Final Seef artwork visibly uses its white monochrome treatment while colored Beyon/BIC artwork remains colored. The archive retains its light background and sloped joins.
- Review popup is a native modal above page controls, auto-focuses its named close button, exposes five named rating choices, and closes with Escape.

OS reduced-motion and frame-time recordings were not performed. Source guards are present; no measured 60fps claim is made. Every possible media contrast or responsive state was not exhaustively measured. No inquiry or review was submitted during testing. Project detail was checked in source; its runtime checks are from the earlier session.
