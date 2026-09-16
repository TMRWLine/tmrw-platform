# Blueprint: Postcode Hero Marketplace

## Standard Build & Execution Commands
- Launch dev server: `npm run dev`
- Compile static production output: `npm run build`
- Run code quality check: `npm run lint`

## Primary System Architecture File Map
- Relational configurations: `src/lib/supabaseClient.ts`
- Direct proxy API handlers: `server/index.js`
- User interface templates: `src/components/`

## Codebase Conventions
- Enforce strict typing across database models to prevent injection risks.
- Keep secret tokens and private keys strictly inside `.env` variables.
- Write direct, modular React components using clean Tailwind utilities.
- Never use team logos, club emblems, or trademarked jerseys in generated videos to preserve NRL and Shute Shield compliance.
