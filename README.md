# CodeGeeks Leaderboard

The live CodeGeeks participant leaderboard. It includes a colorful dark
dashboard, top-three podium, searchable standings, team filters, live score
updates, and bulk participant import.

Scores persist in Upstash Redis.

## Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
   Framework preset "Next.js" is auto-detected — leave defaults and click
   **Deploy**.
2. The first deploy will succeed but the site will error until you add a
   database (next step) — that's expected.

## Configure Upstash Redis

1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database → Upstash → Redis** (the free tier is more than
   enough for this).
3. Vercel automatically adds `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` to your project — no copy/pasting needed.
4. Go to **Deployments** and **Redeploy** the latest deployment so it picks
   up the new environment variables.

Your leaderboard is now live. Use **Bulk add** to paste participant names one
per line, then assign teams and scores.

## Run locally

```bash
npm install
cp .env.local.example .env.local
# fill in the Redis values when using a shared database
npm run dev
```

Open http://localhost:3000.

## Teams

The current teams are Executive Team, Lead, Co-Lead, Event Management, Design,
PR & Marketing, Photography, Video Editing, Anchor, and Logistics & Decor.
They are defined in `lib/types.ts` with their badge colors.

## How it works

- Scores live in a Redis **sorted set** (`leaderboard:scores`), so
  incrementing a score and re-ranking is a single atomic operation —
  simultaneous updates from different people never overwrite each other.
- Names live in a Redis **hash** (`leaderboard:names`), team badges in
  another (`leaderboard:teams`).
- The page polls every 5 seconds so everyone sees roughly-live updates
  without needing websockets.
- Participant changes are handled through protected API routes.

## Project structure

```
  page.tsx                       leaderboard UI
  layout.tsx                     fonts and page metadata
  api/participants/route.ts      public GET and protected POST
  api/participants/[id]/route.ts protected PATCH and DELETE
lib/
  auth.ts                        API access validation
  redis.ts                       Upstash/local Redis-compatible store
  types.ts                       participant type and team definitions
```
