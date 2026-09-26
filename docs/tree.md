# ishoot Ecosystem — Complete File Tree

> Every file and directory in the Turborepo monorepo

---

```
ishoot.bh/
├── .gitignore
├── .npmrc
├── .eslintrc.js
├── turbo.json                          # Turborepo pipeline config
├── package.json                        # Root workspace config (pnpm)
├── pnpm-workspace.yaml                 # Workspace glob patterns
├── pnpm-lock.yaml
├── README.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                      # Lint + type-check + build
│       └── deploy.yml                  # Vercel deployment triggers
│
├── docs/                              # ═══ PROJECT DOCUMENTATION ═══
│   ├── design.md                       # Design system reference
│   ├── structure.md                    # Architecture details
│   ├── tree.md                         # This file
│   ├── admin-rules.md                  # Admin portal rules
│   └── SKILL.md                        # Agent skill file
│
├── apps/
│   ├── web/                            # ═══ PUBLIC FRONTEND (ishoot.bh) ═══
│   │   ├── package.json
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── tsconfig.json
│   │   ├── middleware.ts               # i18n routing + locale detection
│   │   │
│   │   ├── public/
│   │   │   ├── fonts/
│   │   │   │   ├── Virtual.otf
│   │   │   │   ├── IBMPlexSansArabic-Light.ttf
│   │   │   │   ├── IBMPlexSansArabic-Regular.ttf
│   │   │   │   ├── IBMPlexSansArabic-Medium.ttf
│   │   │   │   ├── IBMPlexSansArabic-SemiBold.ttf
│   │   │   │   └── IBMPlexSansArabic-Bold.ttf
│   │   │   ├── images/
│   │   │   │   ├── logo-white.svg
│   │   │   │   ├── logo-color.svg
│   │   │   │   ├── icon.svg
│   │   │   │   └── og-image.jpg
│   │   │   ├── favicon.ico
│   │   │   └── robots.txt
│   │   │
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   │
│   │   │   ├── api/
│   │   │   │   └── inquiry/
│   │   │   │       └── route.ts        # Contact form: insert + 2 emails
│   │   │   │
│   │   │   └── [locale]/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx            # HOME
│   │   │       ├── loading.tsx
│   │   │       ├── not-found.tsx
│   │   │       │
│   │   │       ├── works/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [slug]/
│   │   │       │       └── page.tsx
│   │   │       │
│   │   │       ├── about/
│   │   │       │   └── page.tsx
│   │   │       │
│   │   │       └── contact/
│   │   │           └── page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── LanguageSwitcher.tsx
│   │   │   │   ├── MobileMenu.tsx
│   │   │   │   └── SmoothScroll.tsx
│   │   │   ├── hero/
│   │   │   │   ├── HeroBanner.tsx
│   │   │   │   ├── HeroSlide.tsx
│   │   │   │   ├── AudioToggle.tsx
│   │   │   │   └── VideoProgress.tsx
│   │   │   ├── showreel/
│   │   │   │   ├── ShowreelReveal.tsx
│   │   │   │   └── CinemaOverlay.tsx
│   │   │   ├── services/
│   │   │   │   ├── ServicesBento.tsx
│   │   │   │   └── ServiceCard.tsx
│   │   │   ├── portfolio/
│   │   │   │   ├── PortfolioGrid.tsx
│   │   │   │   ├── PortfolioCard.tsx
│   │   │   │   ├── CategoryTabs.tsx
│   │   │   │   └── CinemaLightbox.tsx
│   │   │   ├── clients/
│   │   │   │   └── LogoMarquee.tsx
│   │   │   ├── about/
│   │   │   │   ├── CEOHero.tsx
│   │   │   │   ├── StorySection.tsx
│   │   │   │   ├── EquipmentGrid.tsx
│   │   │   │   └── StatsCounter.tsx
│   │   │   ├── contact/
│   │   │   │   ├── ContactForm.tsx
│   │   │   │   ├── ServicePills.tsx
│   │   │   │   └── BudgetSelector.tsx
│   │   │   └── shared/
│   │   │       ├── SectionBadge.tsx
│   │   │       ├── AnimatedText.tsx
│   │   │       ├── VideoPlayer.tsx
│   │   │       └── ScrollReveal.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useTranslation.ts
│   │   │   ├── useLocale.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   └── useScrollProgress.ts
│   │   │
│   │   └── lib/
│   │       ├── supabase-client.ts
│   │       ├── supabase-server.ts
│   │       ├── i18n.ts
│   │       └── utils.ts
│   │
│   └── admin/                          # ═══ ADMIN PORTAL (admin.ishoot.bh) ═══
│       ├── package.json
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── tsconfig.json
│       ├── middleware.ts               # Auth guard middleware
│       │
│       ├── public/
│       │   └── fonts/
│       │
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   │
│       │   ├── login/
│       │   │   └── page.tsx
│       │   │
│       │   └── dashboard/
│       │       ├── layout.tsx          # Dashboard shell (sidebar + topbar)
│       │       ├── page.tsx            # Overview / stats
│       │       │
│       │       ├── cms/
│       │       │   ├── layout.tsx
│       │       │   ├── banners/
│       │       │   │   └── page.tsx
│       │       │   ├── portfolio/
│       │       │   │   ├── page.tsx
│       │       │   │   └── [id]/
│       │       │   │       └── page.tsx
│       │       │   ├── clients/
│       │       │   │   └── page.tsx
│       │       │   └── equipment/
│       │       │       └── page.tsx
│       │       │
│       │       ├── crm/
│       │       │   ├── layout.tsx
│       │       │   ├── leads/
│       │       │   │   └── page.tsx
│       │       │   ├── deals/
│       │       │   │   ├── page.tsx
│       │       │   │   └── [id]/
│       │       │   │       └── page.tsx
│       │       │   └── contacts/
│       │       │       ├── page.tsx
│       │       │       └── [id]/
│       │       │           └── page.tsx
│       │       │
│       │       ├── invoices/           # ═══ INVOICE STUDIO ═══
│       │       │   ├── page.tsx        # Invoice list + stats
│       │       │   ├── new/
│       │       │   │   └── page.tsx    # Invoice creator
│       │       │   └── [id]/
│       │       │       └── page.tsx    # Detail + delivery + payments
│       │       │
│       │       ├── payments/           # ═══ PAYMENT TRACKING ═══
│       │       │   ├── page.tsx        # Payment list + receipt history
│       │       │   └── [id]/
│       │       │       └── page.tsx    # Payment detail + receipt view
│       │       │
│       │       ├── expenses/           # ═══ EXPENSE MANAGEMENT ═══
│       │       │   ├── page.tsx        # Expense list + category breakdown
│       │       │   └── [id]/
│       │       │       └── page.tsx    # Expense detail
│       │       │
│       │       ├── finance/            # ═══ FINANCIAL DASHBOARD ═══
│       │       │   └── page.tsx        # P&L, charts, KPIs
│       │       │
│       │       └── settings/
│       │           └── company/
│       │               └── page.tsx    # Company settings (VAT, bank, etc.)
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Topbar.tsx
│       │   │   ├── SidebarNav.tsx
│       │   │   └── BreadcrumbTrail.tsx
│       │   │
│       │   ├── cms/
│       │   │   ├── BannerEditor.tsx
│       │   │   ├── BannerRow.tsx
│       │   │   ├── MediaUploader.tsx
│       │   │   ├── PortfolioEditor.tsx
│       │   │   ├── CreditsBuilder.tsx
│       │   │   ├── EquipmentTable.tsx
│       │   │   └── ClientLogoTable.tsx
│       │   │
│       │   ├── crm/
│       │   │   ├── KanbanBoard.tsx
│       │   │   ├── KanbanColumn.tsx
│       │   │   ├── DealCard.tsx
│       │   │   ├── ContactList.tsx
│       │   │   ├── ContactCard.tsx
│       │   │   ├── LeadInbox.tsx
│       │   │   └── DealDetail.tsx
│       │   │
│       │   ├── invoices/
│       │   │   ├── InvoiceForm.tsx         # Creation form with discount + VAT
│       │   │   ├── LineItemRepeater.tsx     # Dynamic line items
│       │   │   ├── DiscountSelector.tsx     # None / Percentage / Fixed
│       │   │   ├── VATDisplay.tsx           # Conditional VAT section
│       │   │   ├── InvoiceCalculator.tsx    # Real-time totals
│       │   │   ├── InvoicePreview.tsx       # Live preview renderer
│       │   │   ├── InvoiceTemplate.tsx      # PDF template (react-pdf)
│       │   │   ├── InvoiceDelivery.tsx      # Email/WhatsApp/Print/Download toolbar
│       │   │   ├── ClientAutocomplete.tsx
│       │   │   └── InvoiceList.tsx
│       │   │
│       │   ├── payments/
│       │   │   ├── PaymentRecorder.tsx      # Record payment modal
│       │   │   ├── PaymentList.tsx          # Payment history table
│       │   │   ├── PaymentDetail.tsx        # Payment + receipt view
│       │   │   ├── ReceiptTemplate.tsx      # Receipt PDF template
│       │   │   ├── ReceiptDelivery.tsx      # Email/WhatsApp/Print toolbar
│       │   │   └── PaymentMethodBadge.tsx   # Method icon + label
│       │   │
│       │   ├── expenses/
│       │   │   ├── ExpenseForm.tsx          # Add/edit expense form
│       │   │   ├── ExpenseTable.tsx         # Expense list table
│       │   │   ├── ExpenseCategoryChart.tsx # Pie/donut breakdown
│       │   │   └── ReceiptUploader.tsx      # Expense receipt upload
│       │   │
│       │   ├── finance/
│       │   │   ├── KPICards.tsx             # Revenue, Expenses, Profit, Margin
│       │   │   ├── RevenueChart.tsx         # Line: revenue vs expenses
│       │   │   ├── OutstandingWidget.tsx    # Overdue/due breakdown
│       │   │   ├── ExpensePieChart.tsx      # Category donut chart
│       │   │   ├── TransactionFeed.tsx      # Recent payments + expenses
│       │   │   ├── ProfitLossReport.tsx     # P&L summary table
│       │   │   └── DateRangeSelector.tsx    # Period picker
│       │   │
│       │   ├── settings/
│       │   │   ├── CompanySettingsForm.tsx  # Full company config form
│       │   │   ├── VATToggle.tsx            # VAT enable/disable + percentage
│       │   │   └── BankDetailsForm.tsx      # Bank info section
│       │   │
│       │   └── shared/
│       │       ├── DataTable.tsx
│       │       ├── StatusBadge.tsx
│       │       ├── ConfirmDialog.tsx
│       │       ├── EmptyState.tsx
│       │       ├── SearchInput.tsx
│       │       ├── DeliveryToolbar.tsx      # Shared Email/WhatsApp/Print/Download
│       │       └── CurrencyDisplay.tsx      # BHD 3-decimal formatter
│       │
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useProfile.ts
│       │   ├── useRBAC.ts
│       │   └── useCompanySettings.ts       # Company config + VAT state
│       │
│       └── lib/
│           ├── supabase-client.ts
│           ├── supabase-server.ts
│           ├── supabase-middleware.ts
│           ├── pdf-generator.ts            # Invoice PDF generation
│           ├── receipt-generator.ts         # Payment receipt PDF generation
│           ├── finance-calculations.ts      # P&L aggregation queries
│           ├── delivery.ts                  # Email/WhatsApp/Print dispatch
│           └── utils.ts
│
├── packages/
│   ├── database/                       # ═══ SHARED DATABASE LAYER ═══
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts
│   │       ├── types.ts
│   │       ├── schema.sql              # Full migration (all tables + RLS)
│   │       └── queries/
│   │           ├── banners.ts
│   │           ├── portfolio.ts
│   │           ├── clients.ts
│   │           ├── equipment.ts
│   │           ├── inquiries.ts
│   │           ├── crm.ts
│   │           ├── invoices.ts
│   │           ├── payments.ts         # Payment CRUD + invoice status sync
│   │           ├── expenses.ts         # Expense CRUD + category queries
│   │           ├── company-settings.ts # Company config queries
│   │           └── finance.ts          # Aggregation queries for dashboard
│   │
│   ├── ui/                             # ═══ SHARED UI COMPONENTS ═══
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── textarea.tsx
│   │       ├── select.tsx
│   │       ├── badge.tsx
│   │       ├── modal.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── tabs.tsx
│   │       ├── toggle.tsx
│   │       ├── separator.tsx
│   │       ├── skeleton.tsx
│   │       ├── toast.tsx
│   │       ├── tooltip.tsx
│   │       ├── avatar.tsx
│   │       ├── card.tsx
│   │       ├── label.tsx
│   │       └── scroll-area.tsx
│   │
│   ├── email/                          # ═══ EMAIL TEMPLATES ═══
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                # Resend client + sendEmail()
│   │       └── templates/
│   │           ├── layout.tsx          # Shared brand email layout
│   │           ├── inquiry-confirmation.tsx
│   │           ├── inquiry-notification.tsx
│   │           ├── invoice-delivery.tsx
│   │           ├── payment-receipt.tsx
│   │           └── invoice-reminder.tsx
│   │
│   ├── locales/                        # ═══ TRANSLATION FILES ═══
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── en.json
│   │       └── ar.json
│   │
│   └── config/                         # ═══ SHARED CONFIGURATION ═══
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── tsconfig.base.json
│       └── eslint.config.mjs
```

---

## File Count Summary

| Area | Files | Directories |
|------|-------|-------------|
| Root config | ~10 | 2 |
| docs/ | 5 | 1 |
| apps/web | ~48 | ~22 |
| apps/admin | ~78 | ~35 |
| packages/database | ~15 | 3 |
| packages/ui | ~22 | 2 |
| packages/email | ~10 | 3 |
| packages/locales | ~5 | 2 |
| packages/config | ~5 | 1 |
| **Total** | **~198** | **~71** |
