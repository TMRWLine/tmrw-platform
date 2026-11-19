# Homepage 2026 audit

## What changed

- **Lights on:** PR #36’s court and oversized headline stay in place. Three pools of light switch on over the existing photograph, then the court markings extend and the headline settles within 2.8 seconds. The volt dot lands and pulses three times. Navigation and both actions are available throughout. Reduced motion starts on the settled frame.
- **Scroll and touch:** The court widens to the edges as the page scrolls. The court markings inform the three-step sponsorship strip, which reuses the existing claims and consent copy. The two original links remain available in a bottom bar on phones once the cover is off-screen. The bar accounts for safe areas, clears keyboard focus and hides behind the menu and bag. Floodlight parallax and magnetic links require a fine pointer and no reduced-motion preference.
- **References:** [Segment Six](https://www.awwwards.com/sites/segment-six) inspired a single opening beat without a gate; [Engage Summit](https://www.awwwards.com/sites/engage-summit-2027) inspired using geometry to guide readers. Next, compare a subtler court-line cue towards the two existing actions on a real phone. No new photograph or video is needed for that test.

## Local evidence

| Measure | Before, PR #36 | After |
| --- | ---: | ---: |
| Desktop cover image, 1440px at DPR 1 | 15,360 bytes (JPEG) | 2,973 bytes (AVIF) |
| Phone cover image, 390px at DPR 1 | 15,360 bytes (JPEG) | 1,952 bytes (AVIF) |
| Desktop page layout shift during intro, one Chrome run | 0.0169 | 0.0010 |
| Phone page layout shift during intro, one Chrome run | 0.0278 | 0.0000 |

The responsive preload selects the same AVIF as the picture element. WebP and the original JPEG remain available as fallbacks. The hero held the same height before and after the headline settled at both widths. Lighthouse did not produce comparable desktop or phone scores. The first Chrome run reported `PAGE_HUNG`; further runs stalled during navigation or tracing. The measurements above are not Lighthouse or field results.

Headless Chromium checked the 1440px and 390px layouts, the full-bleed scroll state, the menu during the intro, both mobile links, 44px targets, keyboard focus clearing the sticky bar, the bar hiding for the menu and bag, and destination heading focus. It also checked the direct navigation fallback with View Transitions disabled and the settled frame with reduced motion enabled. These are targeted WCAG 2.2 AA checks, not an accessibility conformance claim.

The local production build served with the Vercel header values had no observed CSP violations on the tested homepage and roster flow using local Supabase fixtures. The policy prevents framing and uses a script allowlist without inline script or eval. Inline styles remain allowed for existing React style attributes. Supabase HTTPS and WebSocket endpoints and the Vercel preview toolbar are allowed explicitly. Stripe Checkout is a top-level redirect, not an embedded frame. A source and built-client pattern scan found no known Stripe secret or restricted keys, Supabase service-role keys or private keys. Only the existing public Supabase settings are intended for the client.

`npm audit` fell from 19 findings to 6 (5 moderate, 1 high) with non-breaking dependency updates, including Express 4.22.3. `npm audit --omit=dev` reported zero findings. The remaining advisory chains involve development/build tooling (Vite/esbuild and the PWA build chain). npm proposes breaking changes; those were not applied here. Typecheck and build succeeded. The server suite passed 70 of 71 tests, including the header regression test. The existing Olympic checkout fixture still returns 400 instead of 200.

## Before release

- Verify CSP on the Vercel preview with the deployed Supabase project, Stripe test checkout, roster maps, media and preview toolbar. The local fixture is not evidence that those live integrations work.
- Review Supabase row-level security and storage access for anonymous, athlete, guardian and sponsor roles. Review the existing service worker cache rules for authenticated Supabase responses. No migration was run.
- Schedule and validate the Vite and PWA tooling upgrades separately. Check Safari/iOS, the no-scroll-timeline fallback, screen readers, zoom, contrast over the dynamic cover and a Lighthouse or field performance baseline.
