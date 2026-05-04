# lasermaxx-demo — CLAUDE.md

**Purpose:** Public demo / prototype of the LaserMaxx kiosk system — game setup, airlock countdown, auto-seeded test data. Forks from Codenames; tuned for showcase + Vercel deploy.

## CRITICAL — Next.js version gotcha
**This is NOT the Next.js you know.** Next.js 16 has breaking changes vs. training data. **Read `node_modules/next/dist/docs/` for the relevant feature BEFORE writing any code.** Heed deprecation notices. (Also see `AGENTS.md`.)

## Build & Development Commands
- `npm install` — runs `prisma generate` via `postinstall`.
- `npm run dev` — custom server via `node --import tsx server.js` (Socket.IO).
- `npm run build` — `next build`.
- `npm run start` — production via custom server.
- `npm run lint` — ESLint.
- DB: `npm run db:migrate` / `db:seed` / `db:reset` / `db:seed:demo` (demo-specific seed).
- ALWAYS run from repo root.

## Architecture
- Mirrors **Lasermaxx Codenames** — see that repo's CLAUDE.md for shared decisions.
- Differences:
  - Auto-seeded demo data on every reset (`prisma/seed-demo.ts`).
  - `vercel.json` for Vercel deployment config.
  - Vault README claims Postgres (vs Codenames SQLite) — verify actual `DATABASE_URL` before assuming. Prisma is DB-agnostic.

## Key directories
- Same as Codenames: `src/`, `prisma/`, `public/`, plus `vercel.json`.

## Architecture decisions
- **Vercel-deployable** — but custom Socket.IO server complicates pure serverless. Likely uses long-running compute (Vercel functions or external host). Check `vercel.json` before changing deploy target.
- **Demo seed** (`seed-demo.ts`) provides realistic-looking data for showcases — keep it tasteful, no real venue names, no real player PII.

## Code style
- Same as Codenames.

## Skills
This project follows `~/Documents/Ollies Vault/Meta/Skill-Invocation-Rules.md`. **Mandatory triggers:**
- UI/UX is HIGHER stakes than Codenames — this is the public-facing demo. `ui-ux-pro-max` + `web-design-guidelines` + `motion` mandatory on every visual change.
- Any animation → `motion` (kiosk feel = fluid, snappy, premium).
- Pre-deploy → `vercel:deploy` + `vercel:logs` + verify deployed URL in browser before declaring done.

## Testing
- Same approach as Codenames. **Plus**: smoke-test the deployed Vercel URL after every deploy.

## Environment & secrets
- `.env` for `DATABASE_URL` + Socket.IO config — never commit.
- `lasermaxx.db` if SQLite is in use — never commit.

## Known warts
- DB engine ambiguity (Postgres claimed in vault, SQLite file present in repo). Resolve before shipping.
- Vercel deploy + custom server is non-trivial — confirm `vercel.json` before changing deploy strategy.

## Next Steps
See `Projects/lasermaxx-demo/README.md` in vault.
