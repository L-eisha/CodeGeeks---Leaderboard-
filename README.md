# Code Geeks — Live Leaderboard

A blue-and-white leaderboard for Code Geeks: add all your participants
(100+), tag each with a team badge (Content, PR, Marketing, Design, Social
Media, etc.), and hand out points live with +1 / +5 / +10 / custom buttons.
A top-3 podium sits above a searchable, filterable, paginated list. No
login — anyone with the link can add participants or change scores.
Scores persist in a free Upstash Redis database.

## 1. Add your logo (optional)

Right now the header uses a text wordmark ("Code Geeks" + a `</>` mark) in
`app/page.tsx`, inside the `<div className="flex items-center gap-2 mb-2">`
block. To swap in your real logo:

1. Drop your logo file into the `public/` folder, e.g. `public/logo.png`.
2. In `app/page.tsx`, replace the `</>`  span and the `<h1>Code Geeks</h1>`
   with:
   ```tsx
   <img src="/logo.png" alt="Code Geeks" className="h-10 sm:h-12" />
   ```

## 2. Get the code onto GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
   Framework preset "Next.js" is auto-detected — leave defaults and click
   **Deploy**.
2. The first deploy will succeed but the site will error until you add a
   database (next step) — that's expected.

## 4. Add a free Redis database (Upstash)

1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database → Upstash → Redis** (the free tier is more than
   enough for this).
3. Vercel automatically adds `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` to your project — no copy/pasting needed.
4. Go to **Deployments** and **Redeploy** the latest deployment so it picks
   up the new environment variables.

Your leaderboard is now live. The list starts empty — use **Bulk add** on
the page to paste all 100+ names at once (one per line), optionally
assigning them all to the same team badge, then fine-tune individual
teams from the dropdown next to each name.

## Running locally (optional)

```bash
npm install
cp .env.local.example .env.local
# fill in UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
# (from your Upstash database's "REST API" section, or run
# `vercel env pull .env.local` if the project is linked via Vercel CLI)
npm run dev
```

Open http://localhost:3000.

## Customizing the team badges

Edit `TEAM_OPTIONS` in `lib/types.ts` — each entry is `{ id, label, bg,
text }` (background and text color for the badge pill). Add, rename, or
recolor teams there; the add/filter dropdowns pick it up automatically.

## How it works

- Scores live in a Redis **sorted set** (`leaderboard:scores`), so
  incrementing a score and re-ranking is a single atomic operation —
  simultaneous updates from different people never overwrite each other.
- Names live in a Redis **hash** (`leaderboard:names`), team badges in
  another (`leaderboard:teams`).
- The page polls every 5 seconds so everyone sees roughly-live updates
  without needing websockets.
- There's no login — anyone with the link can add participants, change
  scores, reassign teams, or remove people. If you want to lock down
  editing later, the natural next step is a shared password check in
  `app/api/participants/route.ts` and `app/api/participants/[id]/route.ts`.

## Project structure

```
  page.tsx                       the leaderboard UI (podium, search, list, add/bulk-add)
  layout.tsx                     fonts + page metadata
  api/participants/route.ts      GET (list) / POST (add one or bulk-add many)
lib/
  types.ts                       Participant type + TEAM_OPTIONS (badge colors)
public/
  (put logo.png or logo.svg here if you have one)
```
