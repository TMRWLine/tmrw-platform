---
name: anz-contender-scout
description: Automated daily Tier-1 and Tier-2 ANZ sports scout (Super Rugby, AFL, NRL, Shute Shield, NBL1, ANZ Premiership) and governing body compliance mapper.
---
1. Checkout `release/v1-stable-launch` and branch into `scout/anz-intake-[YYYY-MM-DD]`.
2. Check existing private `athlete_leads` intake migrations to prevent duplicate entries. Never expose private leads in client code.
3. SCRAPING TARGET MATRIX: Scan public team sheets, match reports, and fixture portals across Australia and New Zealand:
   - Rugby Union: Super Rugby Pacific academies + Shute Shield (Sydney clubs) & New Zealand NPC provincial squads.
   - Rugby League: NRL pathways, NSWRL (Ron Massey/Knockout), and QRL (Hostplus Cup) feeder teams.
   - Australian Rules Football (AFL): VFL, SANFL, and WAFL state league lists.
   - Basketball: NBL and NBL1 (East, South, North, West) weekly box scores and standout player rosters.
   - Netball & Football: ANZ Premiership pathways and NPL Men's/Women's football.
4. ANTI-HALLUCINATION & VERIFICATION GATE: Never guess handles or metrics. Cross-reference names against public league data, set unverified engagement metrics to `null`, and include a mandatory `verification_source_url` pointing to the official match sheet or public profile.
5. Add verified contenders only to a private `public.athlete_leads` migration at `supabase/migrations/[YYYYMMDD]_daily_scout_intake.sql`, with a unique claim token and a where-found note alongside the official verification source. Keep RLS enabled with no anon/authenticated table policies. Never insert scouts into `public.athletes`, `src/data/roster.ts`, or `src/data/rosterData.ts`. Athletes become public only through the claim-and-consent RPCs (and guardian consent for minors).
6. Draft personal sponsorship outreach using `src/lib/claimOutreach.ts`. Never send it automatically. Preserve sender identity, contact details, the non-agent disclosure, reason for contact, claim link, and functional unsubscribe link.
7. Run `npx tsc -b` and open a Pull Request titled `scout: daily ANZ contender intake [YYYY-MM-DD]`.
