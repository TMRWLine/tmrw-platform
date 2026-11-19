# tmrw-platform

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-9lx9gvzc)

## Vercel deployment

Use the Vite framework preset, repository root as the project root, Node.js 24.x,
`npm ci` to install, `npm run build` to build, and `dist` as the output directory.
The repository configuration exports Express through `api/[...path].js`; API
requests must reach that function, not the SPA fallback. The bundled commercial
catalogue is explicitly included in the function. No always-running Express
process is needed on Vercel. `npm run dev` still runs Vite and the local API.

Set these variables in each Vercel environment before deploying:

| Variable | Visibility | Requirement |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public browser configuration | Required to render the app; use the intended Supabase project's HTTPS URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public browser configuration | Required to render the app; use the project's `sb_publishable_...` key, never a secret key. Takes precedence over the legacy `VITE_SUPABASE_ANON_KEY`, which is still read when this is unset. |
| `SUPABASE_SECRET_KEY` | Private server | Required for sponsorship checkout grants and escrow payout lookups; use an `sb_secret_...` key. Takes precedence over the legacy `SUPABASE_SERVICE_ROLE_KEY`, which is still read when this is unset. |
| `APP_BASE_URL` | Server | Required in production; the canonical HTTPS deployment origin used for checkout return URLs. |
| `STRIPE_SECRET_KEY` | Private server | Required for real Stripe checkout; absent configuration retains the existing demo flow. |
| `STRIPE_WEBHOOK_SECRET` | Private server | Required to verify real Stripe webhooks at `/api/v1/webhooks/stripe`. |
| `TWELVELABS_API_KEY` | Private server | Required for real video analysis; absent configuration retains sample analysis. |

The two public Supabase variables are required at build time and runtime.
Their absence currently prevents the baseline UI from rendering. Keep private
keys unprefixed, in Vercel's encrypted environment configuration only, and
redeploy after changing variables. Never set `VITE_TWELVELABS_API_KEY` or put a
private Stripe/Supabase key in a `VITE_` variable. Vite exposes only the public
Supabase URL and publishable/anon key prefixes; TwelveLabs credentials are read exclusively by Express.

Video analysis requires a server-verified Supabase access token. Its fixed
index handles are signed for that user, so other accounts cannot search,
upload to or inspect the index. Handles work across function instances without
a local ownership cache. Rotating the provider key invalidates old handles;
re-ingest footage to create new ones after rotation. The fixed
upstream routes reject anonymous spending, validate inputs, bound response sizes,
disable redirects, and apply timeouts and per-process limits. Uploaded footage
is limited to 4 MiB, below Vercel's function payload limit. Set provider quotas
and deployment-edge limits for fleet-wide cost control. No database migration
or production provider call is performed by deployment verification.

Checkout accepts identifiers and validated quantities/options, not buyer
economics. Sponsorship flights use the server catalogue (A$750, A$3,500 and
A$12,500, with the existing A$25,000 world-class option retained). Merchandise
uses its separate server catalogue (A$180 hood, A$95 tee), including costs and
royalty rates. Unknown or locally drafted capsule SKUs cannot be purchased
until registered in the trusted server catalogue. Stripe amounts and split
metadata are calculated from these server-owned records only.

Verification commands:

```sh
npx tsc --noEmit
npm run build
npm test
```

After deployment, check `/api/health`, a direct SPA URL, and the configured
Stripe webhook before enabling live payments. Real Stripe, Supabase and
TwelveLabs provider operation requires the intended environment configuration;
local fixtures and mocked API tests do not verify those live integrations.
