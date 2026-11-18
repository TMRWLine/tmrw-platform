# Review hardening contracts

TwelveLabs paid routes require the current Supabase JWT in `Authorization: Bearer <access_token>`.
The client reads `supabase.auth.getSession()`; no static browser credential is used.
The server verifies it with Supabase `auth.getUser(token)` (8-second deadline).
Set `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_ANON_KEY` (or public legacy
configuration/service role). Missing server auth configuration returns 503, absent/invalid
JWT returns 401; the ingestion caller uses sample analysis on failure.
Paid routes allow 60 requests/user/minute per server process (429 + Retry-After).
This basic in-memory limiter is not shared across serverless instances.

Capsule requests retain `{ capsuleItems: [{ id, qty, size }] }` (or `sku` in place of `id`).
Only `drop_mt_2200` and `drop_sb_2095` are currently published in the server catalogue.
Legacy economics/display fields are ignored. Sizes: XS/S/M/L/XL/XXL, default L.
Unknown/unpublished/custom SKUs return 400, including live checkout; custom designs must
be published server-side before selling. No client-controlled custom preview checkout is enabled.

For local milestone previews call `releaseEscrowMilestoneTranche({ ...params, mode: receipt.mode })`.
Explicit sandbox mode makes no request and returns `released:false, preview:true,
mode:'sandbox_demo'`, zero amount and empty transfer/date fields. UI must label this as
an illustration, never settlement. Missing mode preserves worker-authenticated behaviour.
403 never becomes demo success; browser clients cannot self-approve live funds.

## Paid whitelisting entitlement (not platform fulfilment)

Apply `supabase/migrations/20261018000003_paid_whitelisting_entitlements.sql` through
the normal deployment process; it is not applied by this implementation.
Set server-only `SUPABASE_SERVICE_ROLE_KEY` for persistence.
Checkout callers must explicitly send `whitelisting:true` and their current Supabase JWT
(the typed createCheckoutSession helper attaches it). The server verifies the buyer and
sets buyerId/athleteId/tierId/whitelisting metadata; buyer identity is never accepted from the body.
Existing callers without the flag keep their current checkout behaviour and do not create entitlements.

After verified paid, complete Stripe webhook events, the server inserts an entitlement
idempotently on checkout_session_id. Status is always `pending_fulfilment` on creation.
An entitlement is an internal paid-rights record, **not proof of Meta/TikTok authorisation
or delivery**. No platform tokens are generated. Nothing here activates the entitlement;
only future real platform fulfilment may do so. Duplicate deliveries do not overwrite status.
Without the service role, transfers still process and webhook returns entitlement
status `not_configured` with a value-free warning. Replay the webhook after configuration.

`GET /api/whitelisting/grants?session_id=cs_...` accepts the unguessable Checkout session id
as a public capability, like checkout verification. Anonymous/other-user responses contain
only status/session/athlete/tier/createdAt and a null licenceReference. Only a matching
buyer verified with the current Supabase JWT receives the internal UUID reference; admins
do not receive another buyer's reference. Invalid supplied JWT:401; malformed id:400;
missing storage:503; storage failure:502. Lookups allow 60 requests/IP/minute per process
and send Cache-Control:no-store. Treat the full session-id URL as sensitive; do not share it.
Returns `{ status, licenceReference, checkoutSessionId, athleteId, tierId, createdAt }`.
Status is pending_fulfilment/active/revoked/not_found/not_configured. licenceReference
is an internal UUID, **not a platform token**, and nullable alongside the other absent fields.
`src/api.ts` exports `WhitelistingEntitlement` and `fetchWhitelistingGrant(sessionId)`,
which attaches the current JWT when available, works anonymously on public return pages,
has a 10-second deadline, and returns status 'error' on authentication/network/HTTP errors. UI must display pending status and retrieve the
entitlement instead of minting a grant from a redirect or browser callback.

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
payout. Sandbox release is an illustrative local preview, not settlement;
network errors are not treated as successful release.

RCTI calculations are returned in checkout/webhook ledgers, not persisted into
`rcti_invoices` by this change. `CommercialLedger` is inside `src/App.tsx` and
must be migrated by its owning session to `sponsorshipLedger` instead of its
old 20/80 calculations; pass known payee tax details through `StatementsPanel`.

Run `node --test server/*.test.js` for calculation and mocked webhook tests.

## Checkout return verification

`GET /api/checkout/verify?session_id=cs_test_...` (or `cs_live_...`) retrieves
Stripe state with an expanded PaymentIntent and never performs transfers.
Only a complete, paid session is verified. Sponsorship ledgers are rebuilt
from the server-set Stripe metadata and checked against the paid total.
Legacy/non-sponsorship sessions may be payment-verified with a null ledger.
The response includes no customer details or connected account IDs.
`transfers_recorded` means at least one transfer ID exists in webhook-written
PaymentIntent metadata, not that every payout has settled; otherwise paid
sessions report `awaiting_webhook`. Non-paid sessions report `not_paid`.

The typed browser helper is `verifyCheckoutSession(sessionId)` in `src/api.ts`.
It never throws: network/timeout/HTTP failures return an unverified error.
No Stripe key produces an explicit unverified demo response. Neither query
parameters nor browser state can supply amounts, tax details or athlete/tier IDs.

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
