---
name: anz-contender-scout
description: Daily ANZ pathway and Olympic-runway athlete discovery and governing body compliance mapping.
---
1. Checkout `release/v1-stable-launch` and branch into `scout/anz-intake-[YYYY-MM-DD]`.
2. Read `src/data/roster.ts` to prevent duplicates.
3. Discover 5 to 10 emerging Australian and New Zealand athletes across Rugby League (NRL/NSWRL/QRL/NZRL), Rugby Union (Shute Shield/NPC/Super Rugby), Basketball (NBL1/Sal's NBL), Football (NPL/NZ National League), Netball, Cricket, and Olympic/Action pathways (WSL, Athletics, AusTriathlon, AOC/NZOC).
4. ANTI-HALLUCINATION RULE: Never guess social handles, follower counts, or postcodes. Use public league rosters, news reports, and public search indexes. Set unverified metrics to `null` and include a mandatory `verification_source_url` for every athlete.
5. Append verified entries to `src/data/roster.ts` (`AthleteRecord` schema) and create `supabase/migrations/[YYYYMMDD]_daily_scout_intake.sql`.
6. Run `npx tsc --noEmit` and open a PR titled `scout: daily ANZ contender intake [YYYY-MM-DD]`.
