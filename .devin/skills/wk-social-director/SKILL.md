---
name: wk-social-director
description: Generate daily 500k-follower-optimized social campaigns (IG, TikTok, LinkedIn) inspired by All Blacks, Warriors, and Overtime aesthetics, enforcing zero em-dashes and NZ English.
---
1. Checkout `release/v1-stable-launch` and branch into `marketing/campaigns-[YYYY-MM-DD]`.
2. Read `src/data/roster.ts` and previous campaigns in `/marketing/daily-campaigns/` to select fresh athletes and postcodes.
3. Write 3 high-impact social scripts to `/marketing/daily-campaigns/[YYYY-MM-DD].md` using the 2026 NIL growth pillars:
   - The All Blacks / Overtime Visual Hook: Raw, high-contrast monochrome framing (`#080808` background, `#F7F7F6` text, volt green `#B8FF00` period on `tmrw/.`). No corporate fluff.
   - The 6 AM Shift vs. Matchday Reality: Highlighting the athlete balancing casual work with elite state/national league broadcasts.
   - The Transparent Receipt: Publishing exact dollar splits (e.g., $1,750 athlete / $375 grassroots club) to trigger viral commentary and trust.
4. MANDATORY FORMATTING: Strict New Zealand English spelling (optimise, prioritising, programme), zero em-dashes, and zero technical jargon (never mention PostGIS, Supabase, or APIs).
5. Run `grep -n "—" /marketing/daily-campaigns/[YYYY-MM-DD].md` to verify zero em-dashes exist, then open a Pull Request and post the summary to Slack.
