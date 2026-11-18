# Stripe Connect settlement

`src/lib/commercialLedger.js` is the shared pure calculation source. Sponsorship
prices are GST-exclusive, split 70/15/15 in cents using largest remainders
(ties: athlete, club, platform). Only GST-registered recipients receive an
additional 10% GST. Each RCTI line reports gross including GST, GST, and net
excluding GST. Legacy `rcti_invoices.gst_included=true` values must use
`rctiLine(amount, payee, true)` instead. Retail capsule prices are inclusive;
production costs are retained before the existing net-margin royalty split.

Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and connected accounts:

- `STRIPE_ATHLETE_ACCOUNT_ID`, `STRIPE_CLUB_ACCOUNT_ID`, `STRIPE_PARTNER_ACCOUNT_ID`
- `ATHLETE_ABN`, `CLUB_ABN`, `PLATFORM_ABN`, `PARTNER_ABN`
- `ATHLETE_GST_REGISTERED`, `CLUB_GST_REGISTERED`, `PLATFORM_GST_REGISTERED`,
  `PARTNER_GST_REGISTERED` (explicit `true`; otherwise no GST)

Athlete records from `athlete_profiles` may supply `stripe_account_id`, `abn`,
`gst_registered`, and a `club` object (also accepted from record metadata).
Record flags override environment defaults. Payout destinations and tax flags
are never accepted from the checkout request. Without keys or connected
accounts checkout returns a demo ledger, without charging anyone.

Subscribe the raw-body webhook at `/api/v1/webhooks/stripe` to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, and
`charge.dispute.created`. Paid sessions trigger T+0 transfers from the source
charge. Platform funds stay in the platform account. Session-scoped idempotency
keys and transfer IDs on PaymentIntent metadata protect retries; dispute events
reverse known transfers, including a released final milestone tranche.

The default is full athlete and club release at T+0. Explicit
`milestone_50_50` holds half the athlete payout; `quarterly_batch` retains the
club allocation (a quarterly scheduler is not implemented here).
Live milestone release requires an approved server-to-server POST to
`/api/checkout/release-escrow`, with `{ "sessionId": "cs_..." }` and
`Authorization: Bearer <ESCROW_RELEASE_TOKEN>`. Configure that token only on
trusted approval workers, never in Vite or browser code. The server derives
the amount and destination from Stripe, verifies the original tranche and
rejects disputed/refunded charges. The browser cannot self-approve a live
payout. Sandbox release is explicitly simulated; network errors are not
treated as successful release.

RCTI calculations are returned in checkout/webhook ledgers, not persisted into
`rcti_invoices` by this change. `CommercialLedger` is inside `src/App.tsx` and
must be migrated by its owning session to `sponsorshipLedger` instead of its
old 20/80 calculations; pass known payee tax details through `StatementsPanel`.

Run `node --test server/*.test.js` for calculation and mocked webhook tests.

## TwelveLabs proxy

Set `TWELVELABS_API_KEY` only in the Express/Vercel server environment.
The legacy `VITE_TWELVELABS_API_KEY` is accepted on the server with a
deprecation warning; remove it when migrating. Vite exposes only the public
Supabase configuration variables, so even a legacy video key cannot enter
the browser environment or bundle. Never add secret values to source files.

The browser uses relative `/api/twelvelabs` routes: `GET /status`,
`POST /indexes`, `POST /uploads?index_id=...`, `GET /indexes/:indexId/videos/:videoId`
and `POST /search`. Only those fixed upstream operations are permitted.
Without a key they return HTTP 503 with a not-configured JSON response, and
the client retains its sample-analysis fallback. The media-studio service
remains explicitly demo-only; ingestion uses the proxy.

Uploads accept raw video (or application/octet-stream), capped at 4 MiB to
fit Vercel's 4.5 MB request ceiling. The server constructs multipart data;
it never accepts arbitrary upstream URLs. Larger footage uses sample analysis;
direct-to-storage ingestion is not implemented. JSON is capped at 64 KiB.
Every upstream request has a 10-second deadline. Responses expose only
required IDs, readiness and clip fields, never upstream error bodies or keys.
Existing `/api/*` Vercel routing and disabled body parsing already cover these
routes; no deployment routing change is needed.
