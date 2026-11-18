---
name: ui-brand-audit
description: Audit and harden tmrw/. frontend UI, Awwwards micro-interactions, and NZ English copy compliance.
allowed-tools:
  - read
  - grep
  - glob
  - exec
---
1. Checkout `release/v1-stable-launch` and create branch `feat/ui-brand-hardening`.
2. Grep `src/` for any blue hex codes or Tailwind `blue-` classes and replace with `#080808`, `#F7F7F6`, or `#B8FF00` / `#CCFF00`.
3. Grep `src/` for em-dashes and US spellings; convert to New Zealand English and remove all em-dashes.
4. Audit `AthleteDossierDrawer`, `SponsorDrawer`, and skeleton loaders for smooth `transform`/`opacity` hardware-accelerated transitions.
5. Run `npx tsc --noEmit` and `npm run build`.
6. Start the dev server, verify every drawer and spatial filter (25km, 50km, All) in the headless browser, and attach screenshots to the PR against `release/v1-stable-launch`.
