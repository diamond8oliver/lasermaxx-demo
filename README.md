# LaserMaxx Demo

A public demo / prototype of the LaserMaxx kiosk touchscreen system for laser tag venues. Built on Next.js 16 + SQLite, this demo showcases:

- Staff screen for game setup and operation
- Airlock countdown on a 20-min schedule
- Report time reveal on the confirm screen
- All LaserMaxx game modes (Solo / Team / Elimination variants)
- Auto-reseeding demo data so you can poke at it without resetting manually

This is the public-facing **demo** — the production kiosk app for real LaserMaxx venues lives in a separate repo.

## Stack

- **Next.js 16** (breaking changes from prior versions — see `AGENTS.md`)
- **PostgreSQL** via **Prisma** ORM (see `prisma/schema.prisma`)
- **TypeScript** + **Tailwind**

## Running locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`.

## Next Steps (TODO)

> Handoff notes for any AI or contributor resuming work. Update before context runs out.

**Done (2026-05-04):**
- Staff control panel fully redesigned to match LMX Console v8.12 (boxy grid, stacked sidebar, cyan cell borders, modal new-game form)
- Polling race conditions fixed (single-fetch reuse, `showLoading` param)
- Layout header redesigned with LMX Console tab bar + ONLINE indicator
- Both repos (demo + main Codenames) synced on UI
- Deployed to Vercel

**Immediate:**
- Smoke-test the deployed Vercel URL — verify new LMX Console UI renders correctly
- Extract repeated staff-screen polling logic into a shared hook
- Sync any game-mode changes from the production Lasermaxx Codenames repo

**Short-term:**
- Add a `/how-it-works` explainer page for prospective venue operators
- Mobile-responsive staff view (tablet is primary, but iPhone fallback is useful)

**Blockers / open questions:**
- Should the demo mirror the production game-mode catalog or stay on a simplified subset?

**Environment setup required:**
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/dbname`)
- Node 20+ recommended
- Run `npx prisma migrate deploy` on first setup
