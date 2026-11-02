# Admin Material Design 3

The admin follows Material Design 3, as confirmed for this migration. Keep task flows, permissions, validation and persisted business settings intact when changing the presentation.

## Sources and implementation

- [Material 3 for web](https://m3.material.io/develop/web)
- [Official Material Web](https://github.com/material-components/material-web), including its [ripple](https://github.com/material-components/material-web/blob/main/docs/components/ripple.md), [color](https://github.com/material-components/material-web/blob/main/docs/theming/color.md) and [shape](https://github.com/material-components/material-web/blob/main/docs/theming/shape.md) guidance.
- [Material Design 3 UI skill](https://github.com/skydashnet/material-design-3-ui-skill). Installed in `.agents/skills/material-design-3-ui`; its source is recorded in `skills-lock.json`.

Material Web is in maintenance mode. We use its official ripple for pointer feedback, Google's Material Color Utilities for tonal palettes, and the existing React controls for forms, dialogs and application behavior. This is a custom React implementation of M3, not a claim that every control is an official Material Web component.

## Theme and settings contract

`packages/database/src/constants/theme.ts` generates light and dark schemes from the saved company primary color. The accent supplies a harmonized tertiary palette. Neutral surface mode removes chroma from the surface palette. Every preset uses the same generator.

Official `--md-sys-color-*` tokens are complete CSS colors. `--m3-color-*` aliases contain RGB channels for Tailwind opacity syntax. Do not put bare RGB channels into official Material color tokens. Use paired foregrounds: `primary/on-primary`, `secondary-container/on-secondary-container`, `error-container/on-error-container`, `surface/on-surface`, and `surface/on-surface-variant`.

The admin stylesheet maps existing `ink`, `brand` and `surface` classes to Material roles. New UI can use the explicit `m3-*` Tailwind color names. Avoid hardcoded neutral colors, opacity on reading text, and light/dark overrides that fight the active roles.

Company fonts, root text size, color seeds, neutral/tinted surfaces, card corners and button shapes apply to the admin. Company style presets use the same palette generator and the admin preview now shows their actual shapes. Printed documents retain company colors and document layout.

Preferences has three personal workspace presets and individual controls for density, corners, surface borders, motion, dialog placement and backdrop treatment. These choices are validated and stored under `platform_admin_appearance` in this browser; they do not update company settings. Reset restores the company shape and default workspace presentation. Font sizes use rem units so the company text size remains effective.

A person's light/dark/system preference overrides the company default. It is stored under `platform_admin_theme`, applied before paint, and follows OS changes when system mode is active. Missing or invalid choices fall back to the company default. Appearance choices are also applied before paint; their bootstrap handles invalid or blocked storage.

## Components and layout

| Purpose | Implementation |
| --- | --- |
| Main action | Filled primary button with paired foreground |
| Supporting action | Tonal, outlined or text button |
| Destructive action | Error container and its foreground; explicit confirmation remains |
| Inputs | Outlined text fields, custom anchored selects, associated visible labels, error and disabled states |
| Exclusive setting | Native radio group styled as joined segments, checked indicator and keyboard operation |
| Immediate boolean setting | Native switch/checkbox; retain transactional confirmation where the setting requires it |
| Data groups | Outlined cards by default; filled/elevated variants only when hierarchy needs them |
| Status | Text label plus semantic color; color alone is insufficient |
| Navigation | Persistent drawer on wide windows; modal drawer on compact windows; scrollable settings navigation |
| Dialog | Separate header, scrolling body and action footer; company-derived shape; 32% blurred scrim or stronger dimming; focus containment, Escape and restoration |
| Snackbar | Inverse surface and foreground; actions use inverse primary |

Keep dense tables legible and horizontally scrollable inside their content region. Preserve Arabic direction, avoid Arabic letter-spacing, allow labels to wrap, and expand interactive targets for touch. Use the body, title, headline and display sizes configured in the admin Tailwind theme; all scale with the saved root size.

## Motion and interaction

Use shared M3 durations and easing for state changes. Material Web supplies button ripple feedback. Dialogs and anchored panels use a damped spatial curve; opacity uses faster non-spatial timing. The compact drawer uses a Framer Motion spring (stiffness 400, damping 40, mass 1) from the correct inline edge. These response parameters are implementation choices, not universal M3 physics constants.

System reduced motion and personal reduced/off choices remove spatial animation and ripple feedback. JavaScript metric counters read the same preference, including a setting changed during an active animation. Keep static selected states and visible focus. Do not delay saving or other business actions for animation.

## Dialog and popup contract

`Modal` always supplies a titled header, close control, independently scrolling body, backdrop and separate footer. Place actions in `footer`; when a child form owns its state, use `ModalFooter` and `footer={null}` on its parent dialog. `ModalFooter` renders inline outside dialogs so embedded forms remain reusable. Footer submit buttons must specify their form's stable ID using the native `form` attribute, preserving native validation and submission.

Form dialogs can be centered or docked to the inline end on desktop; compact windows use a bottom sheet. Confirmation and picker dialogs stay centered, and the command palette stays near the top. All fit the viewport. Profile, notification and document-action popovers have distinct header/body/footer surfaces. The nested icon picker uses the shared modal and restores focus to its trigger after closing.

The dialog stack registers a new dialog before moving focus, so an underlying modal cannot reclaim focus. Only the top dialog handles Escape and focus containment. Closing the last dialog restores the prior page scroll setting.

## Selects, scrolling and bidirectional text

All 291 admin select controls use the shared `Select`. Its visible control and portaled menu use Material roles, while a hidden native select preserves names, form submission, required validation, resets and existing change handlers. More than 12 choices enables search; smaller sets support keyboard typeahead without an extra search field. Floating UI flips, shifts and sizes anchored surfaces within the viewport, including within dialogs. Portal ownership keeps dialog focus containment intact. Rich client and product suggestions and PDF menus use the same positioning engine with separate header, body and footer regions.

OverlayScrollbars uses each existing scroll container as its viewport. It adds no content wrappers, retaining React ownership, refs and native scroll events. Tracks overlay the content; entering a scroll region does not change its width. Nested tables and tab bars retain their own horizontal scrolling. Scrollbars follow the document direction and use theme roles.

Layouts use logical spacing. English and Arabic text fields have explicit writing directions; fields that may display either language use automatic direction. Names use bidirectional isolation; identifiers, email addresses, phone numbers and account details retain their intended reading order. The calendar swaps directional icons and date-grid arrow keys for RTL. Tab navigation follows reading direction, with Home/End and a single tab stop for the selected tab.

## Calendar

The calendar has a Google Calendar style toolbar, supporting mini calendar, layer controls, continuous month grid, all-day row and week/day time grid. Overlapping timed events receive separate lanes; overnight events clip to the visible day. Event loading, permissions, sharing, validation and save/delete actions remain in `CalendarView`; `CalendarCanvas` supplies the presentation. On compact screens the supporting pane moves behind the filter control and the create action remains in the toolbar.

Period, route, panel and menu transitions use short Material curves. Reduced/off preferences remove spatial transitions. Pending status icons remain static; indefinite animation is reserved for actual loading.

## Verification

Playwright, Chromium and `@axe-core/playwright` provide browser checks. Vitest checks generated schemes, contrast across every preset and extreme source colors, neutral mode, accent roles, saved theme validation and font handling.

```sh
./run.sh test unit
./run.sh types
./run.sh lint
./run.sh test copy
./run.sh test e2e
```

The production build also checks the static fallback document. The navigation provider keeps its context tree stable when Next prerenders without a router; editable pages keep their existing guards.

E2E preparation recreates only disposable databases ending in `_test`; use the repository's test database tooling. The Material suite checks real HTTP success, dashboard and form accessibility in both modes, keyboard selection, persistence, OS changes, compact RTL navigation, reduced motion and every appearance preset. It waits for finite document-timeline entrance animations before measuring contrast and saves preference screenshots. Scroll-linked scrollbar animations are excluded because they finish with scrolling rather than elapsed time.

Automated axe scans cover tested pages and states, not every workflow. Continue reviewing module-specific dialogs, expanded menus, long Arabic text, zoom, screen-reader behavior and actual touch hardware when those areas change. The website preview and printable documents intentionally retain their own brand presentation.

## Redesign review

The workspace now has a separate navigation rail, collapsible desktop navigation, a framed content panel, clearer headings and data groups, consistent field/button sizing and shared surface borders. Dashboard measurements adapt their typography to each card's width. Screen styling excludes printable document layouts.

All admin modal callers were reviewed. Form actions were moved out of scrolling bodies, including modular forms and edit/review states. Footer action groups wrap when space is limited, and stale body separators were removed. Native submit association, validation, action handlers and permissions remain in their existing code paths. Browser checks cover contrast in both modes, Arabic/English layout, reduced motion, nested focus, backdrop/placement preferences, customization persistence and footer position while scrolling. This is representative workflow coverage, not a per-screen M3 certification.

The admin route audit records all 154 dashboard routes, 52 local tab selections per language and 1,236 viewport measurements. Authentication screens have separate layout, label and error-contrast checks in both languages.

The route-layout audit enumerates the dashboard routes directly from the app directory. It checks local tab panels at 390, 768 and 1440 pixels in both languages. Temporary draft fixtures cover detail routes, and optional modules are enabled only in the disposable database for the audit; records and module flags are restored afterward. The audit fails if any route lacks a fixture. Manual screen-reader, other-browser and physical-device testing remain outside this pass.

## Verification record — 2026-10-27

- Production admin build, admin/UI/web TypeScript checks and lint passed.
- 252 unit tests and 14 repository static checks passed.
- All 154 dashboard route patterns and 52 local tab selections per language passed at 390, 768 and 1440 pixels: 1,236 layout measurements, with no missing detail fixtures.
- The 59-case browser suite passed, including authentication screens, RTL/LTR, menus, form failures, nested focus and mobile navigation. The two route-audit cases passed separately.
- The editor dialog sequence passed 20 additional repetitions. After the final motion fix, the 25-case Material accessibility, appearance and control suite passed again.
- Review images show the calendar, mobile event dialog, searchable select and appearance settings in both languages.

Browser checks used Chromium, including mobile emulation. Physical devices, Safari/Firefox and manual screen-reader testing remain unverified. Temporary test builds were removed; the existing development server was left running.
