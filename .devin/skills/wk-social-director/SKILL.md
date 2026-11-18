---
name: wk-social-director
description: Generate daily Wieden+Kennedy style problem-led social campaigns and art direction from roster data.
---
1. Checkout `release/v1-stable-launch` and branch into `marketing/campaigns-[YYYY-MM-DD]`.
2. Read `src/data/roster.ts` and `/marketing/daily-campaigns/` from the past 7 days to pick fresh athletes and postcodes.
3. Write 3 LinkedIn/Instagram/TikTok scripts to `/marketing/daily-campaigns/[YYYY-MM-DD].md` selling the three core problems:
   - Athlete Problem: 6 AM casual shifts to pay for physio because agents ignore $1,500 local deals.
   - Brand Problem: Local SMEs in postcodes like 2026, 2200, and 1010 burning cash on dead Meta ads instead of backing local contenders 500m away.
   - Club Problem: Grassroots clubs getting $0 after 10 years of junior development, solved by our automatic 15% grassroots club split.
4. Include stark black-and-white art direction notes with JetBrains Mono telemetry overlays.
5. BANNED TERMS: Never mention "PostGIS", "basis-point splits", "SaaS", "API", or "Supabase".
6. Run `grep -n "—" /marketing/daily-campaigns/[YYYY-MM-DD].md` to confirm zero em-dashes, then open a PR and post to Slack.
