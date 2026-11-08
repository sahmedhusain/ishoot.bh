# Seed & Preset Parity

## Overview
This document outlines the seed and preset parity guarantees for `ishoot.bh` between `main` and `feat/go-backend`.

## Core Requirements
1. **Fixture Parity**: All demo fixture files (`apps/admin/lib/demo-presets.ts`, `seeds/demo-clients.json`, `seeds/demo-staff.json`, and pure SQL seeds in `seeds/sql/`) must remain structurally and semantically consistent across environments.
2. **Normalized Phone Numbers**: Phone numbers in staff and client records use E.164 format (e.g. `+97336002200`) across all environments.
3. **Realistic Date Ranges**:
   - Seeded invoices and transactions must span the past 6 months to ensure realistic financial analytics, cash flow trendlines, and aging bucket distribution.
   - Upcoming / open invoices include realistic due dates into the following month.

## Automated Verification
Run the date verification script:
```bash
node scripts/verify-seed-dates.js
```
The script queries the live database (or checks fixture timestamps) and asserts:
- `MIN(date) >= NOW() - 6 months`
- `MAX(date) <= NOW() + 1 month`
- Total transaction count matches the expected demo dataset (11+ invoices, across all aging buckets).
