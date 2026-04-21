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
- **SQLite** for local state (`lasermaxx.db` when present)
- **Prisma** ORM
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

**Immediate:**
- Extract repeated staff-screen polling logic into a shared hook
- Add a `.env.example` file (currently: `DATABASE_URL` is the only required var)
- Sync any game-mode changes from the production Lasermaxx Codenames repo

**Short-term:**
- Deploy to Vercel as a live demo link
- Add a `/how-it-works` explainer page for prospective venue operators
- Mobile-responsive staff view (tablet is primary, but iPhone fallback is useful)

**Blockers / open questions:**
- Polling race conditions were fixed in `d31de30` — monitor for regressions in airlock state transitions
- Should the demo mirror the production game-mode catalog or stay on a simplified subset?

**Environment setup required:**
- `DATABASE_URL` — for SQLite, something like `file:./lasermaxx.db`
- Node 20+ recommended
