# UI, accessibility, printing and devices — 2026-10-30

The top-bar search is now an always-visible combobox with an anchored results surface, arrow-key selection, Escape dismissal and Ctrl/Cmd+K focus. Browser tests now expect a listbox instead of a dialog and retain stale-response, permission and unsaved-change scenarios.

| Finding | Severity / reproduction / evidence | Expected resolution | Status |
|---|---|---|---|
| UI-001 | Medium: old browser tests target removed search modal | Update and run EN/AR light/dark/keyboard/mobile search | Specs updated; runtime not executed here |
| UI-002 | Medium: user-reported selected dropdown text crossing borders | Reproduce at affected page, font, zoom, RTL and viewport; fix shared control | Not yet reproduced or certified fixed |
| UI-003 | Medium: crowded sidebar reported across roles | Task-based navigation with permission-aware grouping and ordering | Remaining |
| UI-004 | Medium: complex workflows still modal-based | Dedicated routes for receiving/transfers/closing/reconciliation | Remaining |
| PRINT-001 | High for warehouse launch: physical print/scanner validation | Real-size PDF templates, calibration, QR/linear scan verification | Physical PDF generation implemented (`stock-label-pdf.tsx`) and route `/api/inventory/labels/[id]/pdf` created; physical handheld scanner testing remaining |
| PRINT-002 | Medium, implemented: customizable document letterheads | Support full-bleed header/footer banner graphics with non-conflicting page numbering | Implemented in `apps/admin/lib/pdf/kit.tsx` with high-contrast translucent micro-badge pill page indicator (`rgba(255, 255, 255, 0.88)`) |
| UI-005 | Low, implemented: unified horizontal brand lockup | Optional full logo display (combined mark + typography) alongside separate icon and logo | Implemented in `BrandAssetsTab.tsx`, `Topbar.tsx`, and `AuthBrandMark.tsx` with aspect-ratio preserving containment |

Label jobs distinguish generation from explicit operator-confirmed physical printing. Reprints preserve the same payload and identifiers. Confirmation does not activate serials or create stock. Camera denial, interrupted scans, USB/HID behavior and physical labels remain untested.
