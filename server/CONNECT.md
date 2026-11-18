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
