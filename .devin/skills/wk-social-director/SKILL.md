---
name: wk-social-director
description: Generate daily TMRWLine social campaigns for Instagram, TikTok and LinkedIn, optimised for growth towards 500,000 real followers and written in New Zealand English.
---
1. Checkout `release/v1-stable-launch` and branch into `marketing/campaigns-[YYYY-MM-DD]`.
2. Read `src/data/roster.ts` and previous campaigns in `/marketing/daily-campaigns/`. Only feature an athlete if their written consent and the media rights for the proposed use are documented. A signed master licence (`master_licence_signed: true`) can help locate that documentation; the flag alone is not clearance. Never name example athletes, scouted prospects or anyone without both permissions in campaign drafts or published posts. Use only verified postcodes for eligible athletes. If no athlete qualifies, write athlete-free brand posts.
3. Write 3 high-impact social scripts to `/marketing/daily-campaigns/[YYYY-MM-DD].md` using the 2026 NIL growth pillars:
   - The Visual Hook: Raw, high-contrast monochrome framing (`#080808` background and `#F7F7F6` text). Use volt green `#B8FF00` for both the slash and dot in the dark `tmrw/.` lockup. No corporate fluff.
   - The 6 AM Shift vs. Matchday Reality: Highlighting the athlete balancing casual work with elite state/national league broadcasts.
   - The Transparent Receipt: Publishing exact dollar splits (e.g., $1,750 athlete / $375 grassroots club) to trigger viral commentary and trust.
4. Use `TMRWLine` as the company name and the identity manual's heavy lowercase `tmrw/.` wordmark with a 23° slash and round dot. Keep `Line up your Future` in copy. In the lockup, centre `LINE UP YOUR FUTURE` in bold, slightly condensed sans-serif capitals directly below the wordmark, with no rule. Allow at least 0.4em of clear space on every side. Use the primary dark or light SVG in `marketing/launch/assets/` for campaigns rather than retyping the logo. The primary light lockup uses ink for the entire mark. The secondary `logo-web-*.svg` variants with a hairline and spaced monospace tagline are for web navigation and footers. Use the rounded-square slash-and-dot app icon for social avatars. Study these benchmark accounts for look, feel and engagement. Use them for reference only: never copy their assets, music or copy, and never tag them.
   - Overtime: Capture raw emotion, the stakes of grassroots games and the human story behind the athlete.
   - House of Highlights: Use quick cuts, punchy score and time captions, and moving type to draw the community into local games.
   - Formula 1: Make the build-up feel cinematic with high-contrast frames, deliberate pacing and quiet details before the action.
   - Red Bull Racing: Use behind-the-scenes craft and precise data overlays to make the work behind performance worth watching.
   - Andscape: Explain the money and access gaps in sport in plain language, with people at the centre.
   - All Blacks: Let restraint, rituals and natural sound build intensity before the first whistle.
   - NZ Warriors: Make local supporters feel part of the story through shared rituals and community pride.
5. Include an asset brief for every post:
   - List the shots or slide visuals, and specify a cover and end card in the campaign palette. Use original or cleared imagery and footage. No team logos, club emblems or trademarked jerseys.
   - Give a music brief with mood, BPM and search terms. Select audio in-app from each platform's commercial-use music library for Instagram and TikTok. Never specify a named copyrighted track or reuse library audio on a different platform. A LinkedIn document post stays silent; give a music brief for a video adaptation only, using original audio or audio cleared for LinkedIn.
   - List relevant hashtags, any planned @ mentions and a reason to share. Tag only athletes or clubs with documented permission to be tagged; otherwise write `None`. Never tag benchmark accounts.
6. MANDATORY FORMATTING: Strict New Zealand English spelling (optimise, prioritising, programme), zero em-dashes or en-dashes, and zero technical jargon (never mention PostGIS, Supabase, or APIs in campaign drafts).
7. Run `rg -n '[\x{2013}\x{2014}]' marketing/daily-campaigns/[YYYY-MM-DD].md .devin/skills/wk-social-director/SKILL.md`. Expect no matches (exit code 1). Then open a Pull Request and post the summary to Slack.
