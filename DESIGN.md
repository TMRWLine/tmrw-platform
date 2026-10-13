# DESIGN.md // tmrw/. Master Creative & Aesthetic Specification

Source of truth: the athlete pitch deck (`slide_reference.html`), built with Off Brand in collaboration with Wieden+Kennedy. Every token below is wired into `tailwind.config.js`. Components should use the utilities, never raw hex values or one-off sizes.

## 1. Aesthetic Framework
- Dark stadium, high contrast. Pure black canvas, one sharp volt accent, nothing soft.
- Editorial, not SaaS. Oversized uppercase type, hairline rules, ruled metric blocks and monospace telemetry.
- No rounded consumer cards, no soft drop shadows, no gradients except the photographic scrims.
- Rhythm alternates between dark grounds and a single chalk ledger band, as the deck alternates dark and chalk slides.
- Every frame, crop and divider anchors to the 23.0 degree kinetic rake.

## 2. Master Chromatics

### Monochrome scale
| Token | Hex | Utility | Role |
| --- | --- | --- | --- |
| `canvas` | `#000000` | `bg-canvas` | Page canvas and photographic wells. |
| `carbon` | `#080808` | `bg-carbon` | Deck stage black, retained for existing components. |
| `obsidian` | `#0A0A0A` | `bg-obsidian` | Container cards, drawers and panels. |
| `hairline` | `#1A1A1A` | `border-hairline` | Solid dark rule. |
| `edge` | `rgba(255,255,255,0.15)` | `border-edge` | Default hairline on dark grounds. |
| `edge-soft` | `rgba(255,255,255,0.10)` | `border-edge-soft` | Row dividers inside a card. |
| `edge-strong` | `rgba(255,255,255,0.30)` | `border-edge-strong` | Outlined controls and registration marks. |
| `signal-white` | `#F9F9F8` | `text-signal-white` | Body text on dark, ledger surfaces. |
| `chalk` | `#F4F4F0` | `bg-chalk` | The single light metrics band. |
| `hairline-light` | `#E5E5EA` | `border-hairline-light` | Dividers on light surfaces. |

Text on dark runs at 100, 80, 65, 50 and 40 percent of signal white. Never go below 40 percent for anything a person must read.

### Kinetic Volt
| State | Hex | Utility | Use |
| --- | --- | --- | --- |
| Default | `#D2FF00` | `bg-volt`, `text-volt` | The deck value. Primary actions, live indicators, terminal periods, open status. |
| Bright | `#D4FF00` | `bg-volt-bright` | Hover and pressed forward state on volt fills. |
| Deep | `#CCFF00` | `border-volt-deep`, `ring-volt-deep` | Grounded state for strokes and focus rings on light surfaces. |

- The deck ships `#D2FF00`. The brief named `#CCFF00` and `#D4FF00`, so both are held as named states either side of the deck value.
- Volt text never sits on chalk or white. On light grounds volt appears only as fills and dots with an obsidian ring.
- `shadow-volt-halo` is the only glow in the system. It is reserved for the Sponsor Athlete action, the Lock Postcode action and their hover states.

### Hyper Electric Cobalt
- `#0038FF` (`bg-cobalt`) marks verification only: pre-cleared status, escrow locks and the chamfer line on a cleared card.
- Cobalt is never decorative.

## 3. Typographic Governance

### Families
| Utility | Stack | Voice |
| --- | --- | --- |
| `font-display`, `font-sans` | Inter | Display and body. Weight 900 for display, 400 and 500 for body. |
| `font-mono` | JetBrains Mono | Kickers, stamps, telemetry and ledger data. Always uppercase. |
| `font-descriptor` | HTF Tungsten, then Oswald | Condensed all-caps descriptors and taglines. |
| `font-mark` | Neue Haas Grotesk Display | Master mark only, all lowercase `tmrw/.`. |

### Scale tokens
Each size utility bundles size, leading, tracking and weight, so one class sets the whole voice.

| Utility | Size | Leading | Tracking | Weight | Use |
| --- | --- | --- | --- | --- | --- |
| `text-display-xl` | 40px to 144px | 0.84 | -0.055em | 900 | Landing console headline. |
| `text-display` | 36px to 104px | 0.88 | -0.05em | 900 | Marketplace hero headline. |
| `text-metric` | 48px to 88px | 0.85 | -0.06em | 900 | Chalk band numerals. |
| `text-headline` | 32px to 56px | 0.92 | -0.05em | 900 | Section headings and hero KPIs. |
| `text-title` | 36px | 0.92 | -0.04em | 900 | Athlete names. |
| `text-metric-sm` | 36px | 1 | -0.04em | 900 | Card metrics. |
| `text-lede` | 15px | 1.6 | 0 | 400 | Supporting copy. |
| `text-kicker` | 10px | 1.5 | 0.24em | 500 | Bracketed section kickers. |
| `text-stamp` | 10px | 1.4 | 0.18em | 700 | Status stamps and buttons. |
| `text-telemetry` | 11px | 1.5 | 0.12em | 500 | Spec row values. |
| `text-caption` | 9px | 1.4 | 0.22em | 500 | Labels on metrics. |

### Tracking standards
- Display and headline type runs tight: `tracking-tightest` (-0.06em), `tracking-display` (-0.05em), `tracking-headline` (-0.04em), `tracking-title` (-0.03em).
- Monospace telemetry runs wide: `tracking-stamp` (0.12em), `tracking-telemetry` (0.18em), `tracking-kicker` (0.24em).
- Display type is always uppercase and closes with the volt terminal period (`.volt-period`), flush kerned.

## 4. Framing and Layout

### Hairline frame
- Hero blocks sit inside a 1px `border-edge` frame with Off Brand registration crosshairs on all four corners (`RegFrame`).
- A header rule and a footer rule inside the frame carry the mark, the kicker and the live telemetry.

### Photographic ground
- The stadium photograph (`/images/stadium-cover.jpg`) sits under four scrims: top, burner, floor and sides. Type always lands on near black.

### Metric layout
- Numerals are oversized, with a ruled mono label beneath and one plain sentence under that.
- Metrics sit in hairline cells with no card fill, as on the deck's evidence slides.

### The 23.0 degree beam
- Athlete cards carry a chamfered top right corner cut at 23 degrees. The chamfer line is cobalt when pre-cleared, volt on hover and focus, and 30 percent white otherwise.
- A thin volt line raked at 23 degrees runs through each card's photographic well.
- Containers at or below 32x32px drop the wordmark and isolate the slash and dot (`/.`).

### Surfaces
- Landing console: dark hero, chalk metrics band, dark discovery section.
- Marketplace roster: `.is-stadium` scope on `.app-shell`, which re-points the shared CSS variables to the dark scale. Drawers, modals and the sign sheet reset to the light ledger surface.

## 5. Components

### Athlete profile card (`AthleteProfileCard`)
Modelled on the deck's roster bays. One component serves both the landing console and the marketplace roster.
1. HUD strip: category status stamp on the left, bracketed index on the right.
2. Photographic well: outlined monogram, volt rake line, location kicker, stacked name with terminal period, then sport and club.
3. Spec rows: catchment, suburb, postcode, league and clearance, divided by `edge-soft` hairlines.
4. Reach drawer on `canvas`: community reach and share of catchment, with a full width ratio rule.
5. Action row (marketplace only), supplied by the caller so handlers stay with the page.

### Category status stamps
| State | Treatment |
| --- | --- |
| Open | Volt outline, volt text and a pulsing volt dot. Available to sponsor. |
| Allocated | Solid signal white fill with obsidian text. Taken. |
| Pending | Outlined at 30 percent white. Agreement in progress. |

### Action hierarchy
- Sponsor Athlete is the heaviest object on any card: full width, 18px vertical padding, solid volt, black mono text, `shadow-volt-halo` on hover.
- Secondary actions (profile and media studio) are outlined at `edge-strong` and turn volt on hover.
- Lock Postcode and Explore Athlete Roster use the same volt treatment as the primary action on their screens.
- Exactly one volt fill is the dominant action in any viewport region.

### Controls
- Segmented radius control: `edge` gaps, selected segment fills volt.
- Inputs: black field, `edge-strong` border, volt border on focus, no radius.

## 6. Motion and Elevation
- No soft shadows. Elevation is expressed through contrast and hairlines.
- Live indicators pulse with `animate-volt-pulse`. Everything animated respects `prefers-reduced-motion`.
- Transitions are 150ms colour changes only.

## 7. Data Mapping
Every figure on screen comes from an existing query. Nothing is invented in the interface.

| Interface element | Source | Notes |
| --- | --- | --- |
| Category status (Open, Allocated, Pending) | `agreement_status` | `active` is Allocated, `pending` is Pending, anything else is Open. |
| Suburb | `Athlete.location` | Marketplace roster only. `get_athletes_in_radius` does not return a suburb. |
| Postcode | `postcode` | Both surfaces. |
| PostGIS catchment | `distance_km`, `bearing_degrees` from `get_athletes_in_radius` | Distance, eight point compass and ratio to the selected radius. Console only. |
| League marker | `getLeagueTag(sport)` in `src/lib/athleteDisplay.ts` | Moved from `App.tsx` unchanged. |
| Community reach | `follower_count` | Both surfaces. |
| Share of catchment | `follower_count` divided by combined reach of the rows on screen | Derived in the browser. Not stored. |
| Clearance | `master_licence_signed` plus `getSportComplianceBadges` | Pre-cleared needs both. |
| Engagement velocity | No source field exists | Not shown. Needs a backend metric before it can be designed in. |

## 8. Copy Rules
- New Zealand English across all copy, documentation and interfaces: prioritising, commercialisation, programmes, optimise, licence.
- No em-dashes anywhere in copy, code or comments. Use commas, semicolons, colons or short separate statements.
- Every descriptive sentence or bullet ends with a full stop.
- Monospace kickers and bracketed indices stay unpunctuated, for example `[ ROSTER // PC 2026 // 10KM ]`.
- Missing values read `N/A` or `Unlisted`, never a dash.

## 9. Implementation Notes
- Tailwind preflight is off because `src/index.css` owns element resets. Elements that opt into `border-solid` start from zero border width through a base rule in the Tailwind plugin, so side-only borders such as `border-b` behave as expected.
- The legacy stylesheet defines `.grid`. New components must use `!grid` to avoid inheriting its background and border.
- New headings, paragraphs and lists set `m-0` explicitly because default margins are not reset.

## 10. Backend Guardrails
- Presentation only. `server/`, `supabase/`, `src/api.ts`, `src/lib/supabase.ts`, `src/lib/supabaseClient.ts` and `src/services/` are not touched by design work.
- All spatial queries go through the `get_athletes_in_radius` stored procedure.
- Every dynamic prop, radius filter and Stripe settlement trigger stays wired to its existing handler.
