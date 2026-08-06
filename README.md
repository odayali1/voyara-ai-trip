# Voyara — AI Trip Platform MVP

Web-first AI travel companion: chat to plan, watch itineraries appear on a live map, save trips, onboard multi-type providers, and inspect traveler intent in admin.

## Stack

- Next.js (App Router) + TypeScript
- Better Auth (email/password) with roles: `TRAVELER` | `PROVIDER` | `ADMIN`
- Prisma + PostgreSQL
- DeepSeek via Vercel AI SDK
- MapLibre + OpenStreetMap
- Nominatim / Overpass / Open-Meteo
- Mock flight/hotel pricing (clear **DEMO** badges)
- Coolify-ready Docker

## Quick start (local)

### 1. Start Postgres

```bash
docker compose up -d
```

### 2. Configure env

```bash
cp .env.example .env
# set DEEPSEEK_API_KEY
```

### 3. Install, migrate, seed

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@voyara.app` | `AdminVoyara123!` |
| Provider | `provider@voyara.app` | `ProviderVoyara123!` |
| Traveler | `traveler@voyara.app` | `TravelerVoyara123!` |

## Coolify deploy

1. Push this `voyara/` app (or the repo root if you set the base directory to `voyara`) to GitHub.
2. In Coolify, create a **PostgreSQL** resource and copy its `DATABASE_URL`.
3. Create a **Docker** / Nixpacks / Dockerfile app from the repo:
   - Base directory: `voyara`
   - Dockerfile path: `Dockerfile`
4. Set env vars:

```
NEXT_PUBLIC_APP_URL=https://your-domain
BETTER_AUTH_URL=https://your-domain
BETTER_AUTH_SECRET=<long-random-secret>
DATABASE_URL=<coolify-postgres-url>
# Local Windows tip: use 127.0.0.1 instead of localhost in DATABASE_URL
DEEPSEEK_API_KEY=<your-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

5. After first deploy, run once (Coolify one-off command or local against prod DB):

```bash
npx prisma db push
npm run db:seed
```

6. Enable GitHub auto-deploy on push.

## Demo script

1. Open landing — brand-first hero.
2. Log in as traveler → preferences already seeded (couple / mid / food+culture).
3. Planner: “Plan 5 days in Tokyo for a couple, mid budget, food + culture.”
4. Watch chat + map pins + itinerary + **MOCK DEMO** prices.
5. Provider login → add a listing; Admin → approve / view intent dashboard.

## Notes

- Flight/hotel prices are **mock demo data** by design for MVP.
- Apify scrapers in `../apis` are a future enrichment menu, not wired into production.
- Share links: `/share/[shareId]` (public read-only).
