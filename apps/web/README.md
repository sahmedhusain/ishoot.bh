# Web application (`apps/web`)

The public-facing website, e-commerce storefront, and customer account portal. Built with Next.js 16 (App Router) with full Arabic (`/ar`) and English (`/en`) localization.

## Overview

- **Content & CMS**: Dynamic block-based pages, navigation menus, news and articles, customer reviews, FAQs, and brand assets.
- **Online Store**: Product catalog, search, shopping cart, coupon codes, and checkout.
- **Payment & Delivery**: Integration with 7 payment gateways (Stripe, Tap, PayTabs, etc.) and delivery slot selection.
- **Customer Accounts**: Customer sign-up, email verification code sign-in, Google & Apple OAuth sign-in, order history, and tracking.

## Architecture

- Server-side data fetching via `@platform/api-client` through the API gateway.
- Customer session management through the Go `identity` and `commerce` services.
- Automatic website revalidation when content changes in CMS via revalidation tokens.

## Development, Checks & Testing

```bash
# Start standalone dev server (port 3000)
npm run dev

# Type check
npm run type-check

# Run unit tests
npm test

# Run Playwright end-to-end tests
npm run test:e2e

# Domain-specific check suites
npm run check:website       # Website database integrity checks
npm run check:website-http  # Website HTTP endpoints and preview checks
```
