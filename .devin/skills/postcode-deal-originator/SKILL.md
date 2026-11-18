---
name: postcode-deal-originator
description: Match active athlete postcodes to 15 real local SMEs and generate compliant sponsorship outreach payloads.
---
1. Checkout `release/v1-stable-launch` and branch into `commercial/outreach-[YYYY-MM-DD]`.
2. Read `src/data/roster.ts` to get active athlete postcodes, 5km-25km catchments, and `branding_categories.locked` arrays.
3. Identify 15 real, currently operating local SMEs or multi-site franchises in those postcodes with a verified live website URL and street address.
4. Cross-check `branding_categories.locked` to ensure zero category conflicts, a assign each business to Flight 01 ($750/qtr), Flight 02 ($3,500/yr), or Flight 03 ($12,500/yr).
5. Write the lead list and custom problem-led outreach emails (highlighting the local contender, 15% grassroots club reinvestment, and instant RCTI tax compliance) to `/marketing/outreach-queues/[YYYY-MM-DD].json` and stage SQL inserts in `supabase/seed/sponsors_[YYYY_MM_DD].sql`.
6. Run `grep -n "—" /marketing/outreach-queues/[YYYY-MM-DD].json` to verify zero em-dashes, then open a PR titled `commercial: daily postcode deal origination [YYYY-MM-DD]`.
