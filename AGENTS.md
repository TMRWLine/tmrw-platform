# AGENTS.md - tmrw/. Global Repository Rules

## Setup & Verification Commands
- Install dependencies: `npm install`
- Start dev environment: `npm run dev`
- Typecheck (MUST pass before any PR): `npx tsc --noEmit`
- Production build (MUST pass before any PR): `npm run build`

## Branch & Release Governance
- Production baseline is locked at `release/v1-stable-launch` (commit 64e7384, tag `v1.0-launch-ready`).
- NEVER push directly to or overwrite `release/v1-stable-launch`. Always branch off `release/v1-stable-launch` and open a Pull Request.
- Never commit `.env` files or hardcoded API keys in `src/`.

## Brand, Design & Copy Guardrails
- Palette: Strictly editorial black (`#080808`), off-white (`#F7F7F6`), and volt green (`#B8FF00` / `#CCFF00`) on `tmrw/.` brand marks and terminal fullstops. Zero cobalt blue anywhere in CSS or Tailwind classes.
- Typography: JetBrains Mono for telemetry data + bold display headers.
- Localisation: Strictly use New Zealand English spelling (optimise, prioritising, programme, licence, colour) in all UI strings, outreach copy, and documentation.
- Punctuation: Never use em-dashes anywhere in UI copy, markdown campaigns, outreach emails, or code comments.
