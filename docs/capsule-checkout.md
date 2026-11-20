# Capsule Bag and test receipts

- Capsule checkout accepts Stripe test keys only (`sk_test_` or `rk_test_`). With no key it keeps the explicit demo-order flow. Live keys are rejected before a provider call.
- Bag lines persist under `tmrw_capsule_bag_v1` for seven days of inactivity. Only SKU, size and quantity are stored. Rehydration uses current client catalogue data, drops unknown SKUs/sizes and clamps single garments to 1–100 or venue packs to 25–100 in steps of 25.
- Subtotal is ex-GST. GST is charged on top as one `GST (10%)` Stripe line, rounded to cents on the complete subtotal. Shipping is not configured or charged: Bag displays `$0.00 (not charged)` in AUD. Split metadata remains ex-GST and net of blank garment cost.
- The return URL opens Bag for cancellation or a receipt for success, then removes checkout query parameters while preserving unrelated parameters/hash. Success is not proof of payment: `/api/checkout/capsule-session` retrieves the test session and its line items from Stripe. Only `payment_status=paid` clears Bag. The response is not cached and excludes customer/contact/payment identifiers and arbitrary metadata.
- Receipts use Stripe's line-item amounts, total, tax and shipping amounts. This is a payment-status receipt, not a fulfilment or delivery confirmation. There is no automatic retry/payment attempt on a return URL.
- Card, Studio and server split maths share `src/lib/capsuleCommerce.ts`: round each unit's net margin to cents, apply the royalty rate, round each allocation to cents, then multiply by garment quantity.

## Product-photo shoot geometry

No photo sourcing or manifest tooling is part of this change. The published manifest stays empty. Missing/404 views show a branded placeholder; missing still views remain selectable when a partial set is published. No stock or generated images are used.

- The gallery image uses `object-fit: contain`, filling the fixed media frame without cropping or changing the frame when an image fails.
- At 1440 × 900, the media frame is **605 × 460 CSS pixels**, measured in the capsule overlay. The actual frame ratio is approximately **1.315:1** because its height is capped at 460px.
- The CSS preferred ratio is **4:5** for product views and at widths of 640px or greater, with a **460px maximum height**. At narrower widths with no published views the placeholder uses **16:10**. Actual width follows the card's responsive column width, so this is not a fixed export resolution.
- Shoot portrait **4:5** stills with space around the complete garment, using the same canvas/framing across front/back/detail and all 36 turntable frames. Higher-resolution source files are appropriate for high-DPI displays; the UI does not crop them to its desktop frame ratio.
- Existing paths remain `public/products/<sku>/front.jpg`, `back.jpg`, `detail-1.jpg`, and `spin/01.jpg` through `spin/36.jpg`; publish only available views in `src/data/product-photos.json`.
