# pogi.codes

Playful, Filipino-flavored social hub for **@pogicodes**. Goal: grow the channels. Step 1 (live): Facebook-first quick view. Next: walkable island game (Phaser) on top. See [`docs/PLAN.md`](docs/PLAN.md).

## Stack

Next.js 16 (App Router, Cache Components) · Tailwind 4 · Vercel (hourly ISR) · Teable as CMS.

## Develop

```bash
pnpm install
cp .env.example .env.local   # optional — site runs on fallbacks without it
pnpm dev
```

## Data

| What | Source | Edit where |
|---|---|---|
| Identity, intro lines, fallback levels | `src/site.config.ts` | code |
| Level name / pitch / CTA / color / order / visibility / stats | Teable `Socials` | Teable |
| Latest 3 posts per platform (non-YouTube); first Facebook reel / TikTok video is embedded (loads on tap) | Teable `Posts` (`Publishing status = Published`) | Teable |
| YouTube videos (Shorts excluded) | YouTube RSS | — |
| Hidden-beach reward (message + link) | Teable `Secret` (first `Active` row) | Teable |
| GitHub repos | Teable `Repos` (`Show on site`, sorted by `Order`), filled by your crawler automation. Tokenless GitHub REST "recent repos" fallback if empty or unavailable | Teable |

Everything is fetched server-side in `src/lib/data.ts` (`"use cache"` + `cacheLife("hours")`) and wrapped with fallbacks. A failing source never breaks the page.

## Game (Pogi Island)

- Phaser 4 (Arcade Physics), lazy-loaded client-side in `src/components/game/GameShell.tsx`; scene in `src/game/WorldScene.ts`.
- Assets live in `public/game/` (committed). Rebuild them from the CC0 "Ninja Adventure" pack (free on itch.io):

  ```bash
  PACK_DIR="/path/to/Ninja Adventure - Asset Pack" node scripts/build-game-assets.mjs
  ```

  This crops buildings/trees, draws the custom sprites (jeepney, coconut, lamok, ipis, signs), converts audio to mp3, and writes the island map as Tiled JSON (`public/game/map/island.json`, editable in Tiled).
- Game state is in `localStorage` (`pogi:save:v1`); healed content per session in `sessionStorage`.
- `?debug` exposes `window.__pogi` (`bridge`, `store`, `game`) for testing.

## Icons & share images

- Favicon / app / PWA icons are generated from `public/logo.png`: `node scripts/build-icons.mjs`.
- Open Graph + Twitter card: `src/app/opengraph-image.tsx` (island bg from `assets/og-island.png`), re-exported by `twitter-image.tsx`.

## Env vars (Vercel → Project → Settings → Environment Variables)

- `TEABLE_API_TOKEN`: Teable personal access token with **record read** scope, limited to base `bsekboWJc9EkYrxrX6I`.
- `TEABLE_API_URL`: optional, default `https://app.teable.ai`.

## Deploy

1. Import the repo in Vercel, add the env vars, deploy.
2. Enable **Web Analytics** in the Vercel project.
3. Add domain `pogi.codes` and set the DNS records Vercel shows.
