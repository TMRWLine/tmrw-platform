# Capsule Bag and receipts

- Capsule checkout supports Stripe test and live keys. Receipt verification accepts `cs_test_` and `cs_live_` session IDs and requires the ID mode and Stripe session `livemode` to match the configured `sk_test_`/`rk_test_` or `sk_live_`/`rk_live_` key. With no key, checkout keeps the explicit demo-order flow. All verification tests use stubs; actual payment testing must use test mode only.
- Bag lines persist under `tmrw_capsule_bag_v1` for seven days of inactivity. Only SKU, size and quantity are stored. Rehydration uses current client catalogue data, drops unknown SKUs/sizes and clamps single garments to 1–100 or venue packs to 25–100 in steps of 25.
- Before redirecting to Stripe, checked-out quantities are saved under a versioned per-session pending-checkout key. Confirmed payment subtracts only those quantities from the latest persisted Bag, preserving newer additions. A settled marker prevents repeated receipt visits subtracting twice. Missing or expired snapshots retain the legacy full-clear behaviour.
- Subtotal is ex-GST. GST is charged on top as one `GST (10%)` Stripe line, rounded to cents on the complete subtotal. Shipping is not configured or charged: Bag displays `A$0.00 (not charged)`. All AUD amounts in Bag and receipts use `A$`. Split metadata remains ex-GST and net of blank garment cost.
- The return URL opens Bag for cancellation or a receipt for success, then removes checkout query parameters while preserving unrelated parameters/hash. Success is not proof of payment: `/api/checkout/capsule-session` retrieves the session and its line items from Stripe. Only `payment_status=paid` clears Bag. The response is not cached and excludes customer/contact/payment identifiers and arbitrary metadata.
- Receipts use Stripe's line-item amounts, total, tax and shipping amounts. This is a payment-status receipt, not a fulfilment or delivery confirmation. There is no automatic retry/payment attempt on a return URL.
- New sessions store net, garment cost and platform cents alongside the ex-GST split metadata. Paid and demo receipts explain the net basis and include the platform remainder so allocations add up. Zero collaborator allocations are hidden. Older sessions without the added metadata show only the available net allocations, without inventing costs or a platform amount.
- Card, Studio and server split maths share `src/lib/capsuleCommerce.ts`: round each unit's net margin to cents, apply the royalty rate, round each allocation to cents, then multiply by garment quantity.
- Runtime: `package.json` requires Node 24.x. There is no `.nvmrc` or Vercel runtime override; `api/[...path].js` re-exports `server/index.js`. Node 24 supports native type stripping for the shared `.ts` module, which uses erasable types and no TypeScript-only runtime syntax. Both entry points can run directly without the test runner's `tsx` loader.

## Product-photo shoot geometry

The manifest currently enables owner-authorised Earls Collection product-photo previews, pending owner approval. These are source-product photos, not finished athlete capsule photography. Missing/404 views still show a branded placeholder. No stock, generated, retouched branding or 360 images are used.

### Earls preview sources

All source URLs below were taken from `https://www.earlscollection.com/products/<handle>.json` and visually inspected. Outputs are centred 4:5 crops, 1280 × 1600 optimised progressive JPEGs, each below 320KB. Product pricing and capsule designs are unchanged.

- `drop_mt_2200`, handle `contrast-hood-black`: flat front, on-model back (no flat back available), fabric/appliqué detail. The detail has a misleading source filename but visibly shows this hoodie's appliqué.
  - `front.jpg`: https://cdn.shopify.com/s/files/1/0013/6658/9507/files/ContrasstHood-Black_Front.png?v=1783520756
  - `back.jpg`: https://cdn.shopify.com/s/files/1/0013/6658/9507/files/F59_260602_Earls_eComm_05.jpg?v=1782189025
  - `detail-1.jpg`: https://cdn.shopify.com/s/files/1/0013/6658/9507/files/Two-WayGilet-Chord_Back_1390527f-311b-4047-a4ac-d75f05d71a6b.png?v=1783520768
- `drop_sb_2095`, handle `family-heritage-tee-vintage-black`: plain unbranded washed front, rear-print flat shot and printed-fabric detail. Selected over Pollock's paint splatter and the more prominent front lettering on Lowercase, Gothic and Sidewalk. The rear print is retained, not retouched.
  - `front.jpg`: https://cdn.shopify.com/s/files/1/0013/6658/9507/files/FamilyHeritageTee_1.jpg?v=1794272145
  - `back.jpg`: https://cdn.shopify.com/s/files/1/0013/6658/9507/files/FamilyHeritageTee_Flatlay_1.png?v=1794272147
  - `detail-1.jpg`: https://cdn.shopify.com/s/files/1/0013/6658/9507/files/FamilyHeritageTee_Detail_2.png?v=1794272148

- The gallery image uses `object-fit: contain`, filling the fixed media frame without cropping or changing the frame when an image fails.
- At 1440 × 900, the media frame is **605 × 460 CSS pixels**, measured in the capsule overlay. The actual frame ratio is approximately **1.315:1** because its height is capped at 460px.
- The CSS preferred ratio is **4:5** for product views and at widths of 640px or greater, with a **460px maximum height**. At narrower widths with no published views the placeholder uses **16:10**. Actual width follows the card's responsive column width, so this is not a fixed export resolution.
- Shoot portrait **4:5** stills with space around the complete garment, using the same canvas/framing across front/back/detail and all 36 turntable frames. Higher-resolution source files are appropriate for high-DPI displays; the UI does not crop them to its desktop frame ratio.
- Existing paths remain `public/products/<sku>/front.jpg`, `back.jpg`, `detail-1.jpg`, and `spin/01.jpg` through `spin/36.jpg`; publish only available views in `src/data/product-photos.json`.
