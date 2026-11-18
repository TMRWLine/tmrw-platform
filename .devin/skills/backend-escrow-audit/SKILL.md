---
name: backend-escrow-audit
description: Verify Express port binding, Vercel config, Stripe 70/15/15 escrow math, and PostGIS/TwelveLabs fallbacks.
allowed-tools:
  - read
  - grep
  - glob
  - exec
---
1. Checkout `release/v1-stable-launch` and create branch `feat/backend-vercel-hardening`.
2. Audit `server/index.js` and `src/api.ts` for graceful `EADDRINUSE` handling and verify `vercel.json` routes `/api/*` to Express and all other routes to the Vite SPA.
3. Verify `CommercialLedger` calculates 70/15/15 escrow splits and 10% GST / RCTI ledger entries in integer cents.
4. Ensure `fetchAthletesByTier`, `fetchAthletesNearby`, `fetchNearbySponsors`, and TwelveLabs calls fall back cleanly to `src/data/roster.ts` after a 5000ms timeout.
5. Run `npx tsc --noEmit` and `npm run build`, verify fallback rendering in the browser, and open a PR against `release/v1-stable-launch`.
